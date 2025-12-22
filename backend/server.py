from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
import socketio
# from emergentintegrations.payments.stripe.checkout import (
#     StripeCheckout,
#     CheckoutSessionResponse,
#     CheckoutStatusResponse,
#     CheckoutSessionRequest
# )

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Stripe Configuration
#

# Security
security = HTTPBearer()

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Wrap FastAPI app with Socket.IO
socket_app = socketio.ASGIApp(sio, app)

# ==================== Models ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str  # user, provider, admin
    phone: Optional[str] = None
    blocked: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str
    provider_name: str
    name: str
    description: str
    category: str
    price: float
    location: str
    duration: int  # in minutes
    image_url: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ServiceCreate(BaseModel):
    name: str
    description: str
    category: str
    price: float
    location: str
    duration: int
    image_url: str

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    location: Optional[str] = None
    duration: Optional[int] = None
    image_url: Optional[str] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    service_id: str
    service_name: str
    provider_id: str
    provider_name: str
    date: str
    time: str
    status: str  # pending, accepted, rejected, en-route, started, completed, cancelled
    payment_status: str  # pending, paid, refunded
    amount: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookingCreate(BaseModel):
    service_id: str
    date: str
    time: str

class BookingStatusUpdate(BaseModel):
    status: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    service_id: str
    booking_id: str
    rating: int  # 1-5
    comment: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    service_id: str
    booking_id: str
    rating: int
    comment: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    booking_id: str
    user_id: str
    amount: float
    currency: str
    payment_status: str  # pending, paid, failed
    metadata: Optional[Dict] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get('blocked'):
            raise HTTPException(status_code=403, detail="Account blocked")
        
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== Socket.IO Events ====================

@sio.event
async def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

@sio.event
async def join_booking(sid, data):
    booking_id = data.get('booking_id')
    await sio.enter_room(sid, f"booking_{booking_id}")
    logging.info(f"Client {sid} joined booking_{booking_id}")

# ==================== API Routes ====================

@api_router.get("/")
async def root():
    return {"message": "BookTrack API"}

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_pw = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_pw
    
    await db.users.insert_one(doc)
    
    # Create token
    token = create_access_token({"sub": user.id, "role": user.role})
    
    return {
        "token": token,
        "user": user.model_dump()
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get('blocked'):
        raise HTTPException(status_code=403, detail="Account blocked")
    
    token = create_access_token({"sub": user['id'], "role": user['role']})
    
    user.pop('password', None)
    user.pop('_id', None)
    
    return {
        "token": token,
        "user": user
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Service Routes
@api_router.post("/services", response_model=Service)
async def create_service(service_data: ServiceCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Only providers can create services")
    
    service = Service(
        provider_id=current_user['id'],
        provider_name=current_user['name'],
        **service_data.model_dump()
    )
    
    await db.services.insert_one(service.model_dump())
    return service

@api_router.get("/services")
async def get_services(
    category: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    query = {}
    
    if category:
        query['category'] = category
    if location:
        query['location'] = {"$regex": location, "$options": "i"}
    if min_price is not None or max_price is not None:
        query['price'] = {}
        if min_price is not None:
            query['price']['$gte'] = min_price
        if max_price is not None:
            query['price']['$lte'] = max_price
    
    services = await db.services.find(query, {"_id": 0}).to_list(1000)
    
    # Add average rating for each service
    for service in services:
        reviews = await db.reviews.find({"service_id": service['id']}, {"_id": 0}).to_list(1000)
        if reviews:
            avg_rating = sum(r['rating'] for r in reviews) / len(reviews)
            service['average_rating'] = round(avg_rating, 1)
            service['review_count'] = len(reviews)
        else:
            service['average_rating'] = 0
            service['review_count'] = 0
    
    return services

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Add reviews
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).to_list(1000)
    service['reviews'] = reviews
    
    if reviews:
        avg_rating = sum(r['rating'] for r in reviews) / len(reviews)
        service['average_rating'] = round(avg_rating, 1)
        service['review_count'] = len(reviews)
    else:
        service['average_rating'] = 0
        service['review_count'] = 0
    
    return service

@api_router.get("/services/provider/my-services")
async def get_my_services(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Only providers can access this")
    
    services = await db.services.find({"provider_id": current_user['id']}, {"_id": 0}).to_list(1000)
    
    # Add ratings
    for service in services:
        reviews = await db.reviews.find({"service_id": service['id']}, {"_id": 0}).to_list(1000)
        if reviews:
            avg_rating = sum(r['rating'] for r in reviews) / len(reviews)
            service['average_rating'] = round(avg_rating, 1)
            service['review_count'] = len(reviews)
        else:
            service['average_rating'] = 0
            service['review_count'] = 0
    
    return services

@api_router.put("/services/{service_id}")
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Only providers can update services")
    
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service['provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in service_data.model_dump().items() if v is not None}
    
    if update_data:
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return updated

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Only providers can delete services")
    
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service['provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.services.delete_one({"id": service_id})
    return {"message": "Service deleted"}

# Booking Routes
@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'user':
        raise HTTPException(status_code=403, detail="Only users can create bookings")
    
    service = await db.services.find_one({"id": booking_data.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    booking = Booking(
        user_id=current_user['id'],
        user_name=current_user['name'],
        service_id=service['id'],
        service_name=service['name'],
        provider_id=service['provider_id'],
        provider_name=service['provider_name'],
        date=booking_data.date,
        time=booking_data.time,
        status="pending",
        payment_status="pending",
        amount=service['price']
    )
    
    await db.bookings.insert_one(booking.model_dump())
    return booking

@api_router.get("/bookings/user/my-bookings")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'user':
        raise HTTPException(status_code=403, detail="Only users can access this")
    
    bookings = await db.bookings.find({"user_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.get("/bookings/provider/requests")
async def get_provider_bookings(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Only providers can access this")
    
    bookings = await db.bookings.find({"provider_id": current_user['id']}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Providers can update status
    if current_user['role'] == 'provider' and booking['provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Users can only cancel
    if current_user['role'] == 'user':
        if booking['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        if status_update.status != 'cancelled':
            raise HTTPException(status_code=403, detail="Users can only cancel bookings")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status_update.status}}
    )
    
    # Emit socket event for real-time update
    await sio.emit('booking_status_update', {
        'booking_id': booking_id,
        'status': status_update.status
    }, room=f"booking_{booking_id}")
    
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    if current_user['role'] == 'user' and booking['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user['role'] == 'provider' and booking['provider_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return booking

# Review Routes
@api_router.post("/reviews")
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'user':
        raise HTTPException(status_code=403, detail="Only users can create reviews")
    
    # Check if booking exists and is completed
    booking = await db.bookings.find_one({"id": review_data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if booking['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"booking_id": review_data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review = Review(
        user_id=current_user['id'],
        user_name=current_user['name'],
        service_id=review_data.service_id,
        booking_id=review_data.booking_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    return review

@api_router.get("/reviews/service/{service_id}")
async def get_service_reviews(service_id: str):
    reviews = await db.reviews.find({"service_id": service_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reviews

# =========================
# Payment Routes (MOCK)
# =========================

@api_router.post("/payments/create-checkout")
async def create_mock_checkout(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Get booking
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if booking["payment_status"] == "paid":
        return {
            "success": True,
            "message": "Already paid",
            "session_id": "mock_existing"
        }

    # Create mock payment transaction
    transaction = PaymentTransaction(
        session_id=f"mock_{uuid.uuid4()}",
        booking_id=booking_id,
        user_id=current_user["id"],
        amount=float(booking["amount"]),
        currency="INR",
        payment_status="pending",
        metadata={"mode": "mock"}
    )

    await db.payment_transactions.insert_one(transaction.model_dump())

    # Mark booking as paid
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_status": "paid"}}
    )

    return {
        "success": True,
        "message": "Payment successful (mock)",
        "session_id": transaction.session_id
    }

@api_router.post("/payments/confirm-mock")
async def confirm_mock_payment(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Allow payment ONLY if provider completed the job
    if booking["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail="Payment allowed only after service completion"
        )

    await db.payment_transactions.update_one(
        {"booking_id": booking_id},
        {"$set": {"payment_status": "paid"}}
    )

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"payment_status": "paid"}}
    )

    return {"success": True, "message": "Mock payment successful"}


#@api_router.get("/payments/checkout-status/{session_id}")
#async def get_checkout_status(session_id: str):    
    # Get transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already processed, return current status
    if transaction['payment_status'] == 'paid':
        return {
            "status": "complete",
            "payment_status": "paid",
            "booking_id": transaction['booking_id']
        }
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and booking if paid
    if status.payment_status == 'paid' and transaction['payment_status'] != 'paid':
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid"}}
        )
        
        await db.bookings.update_one(
            {"id": transaction['booking_id']},
            {"$set": {"payment_status": "paid"}}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "booking_id": transaction['booking_id']
    }

#@api_router.post("/webhook/stripe")
#async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            # Update transaction
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction and transaction['payment_status'] != 'paid':
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                
                await db.bookings.update_one(
                    {"id": transaction['booking_id']},
                    {"$set": {"payment_status": "paid"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Admin Routes
@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_users = await db.users.count_documents({"role": "user"})
    total_providers = await db.users.count_documents({"role": "provider"})
    total_services = await db.services.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    
    # Most booked services
    pipeline = [
        {"$group": {"_id": "$service_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_services = await db.bookings.aggregate(pipeline).to_list(5)
    
    # Enrich with service details
    for item in top_services:
        service = await db.services.find_one({"id": item['_id']}, {"_id": 0})
        if service:
            item['service'] = service
    
    return {
        "total_users": total_users,
        "total_providers": total_providers,
        "total_services": total_services,
        "total_bookings": total_bookings,
        "top_services": top_services
    }

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/block")
async def block_user(user_id: str, block: bool, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.users.update_one({"id": user_id}, {"$set": {"blocked": block}})
    return {"message": "User updated"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}

@api_router.get("/admin/bookings")
async def get_all_bookings(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin only")
    
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
