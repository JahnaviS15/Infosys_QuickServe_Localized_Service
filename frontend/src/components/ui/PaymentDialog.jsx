import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PaymentDialog = ({ booking, onConfirm }) => {
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const [card, setCard] = useState({
        number: "",
        expiry: "",
        cvv: "",
        name: ""
    });

    const handlePay = async () => {
        if (!card.number || !card.expiry || !card.cvv || !card.name) {
            return;
        }

        setProcessing(true);

        // simulate payment gateway delay
        setTimeout(async () => {
            await onConfirm();
            setProcessing(false);
            setSuccess(true);
        }, 2000);
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button>Pay ₹{booking.amount}</Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                {!success ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Secure Payment</AlertDialogTitle>
                        </AlertDialogHeader>

                        <div className="space-y-3">
                            <Input
                                placeholder="Cardholder Name"
                                value={card.name}
                                onChange={(e) => setCard({ ...card, name: e.target.value })}
                            />

                            <Input
                                placeholder="Card Number"
                                value={card.number}
                                onChange={(e) => setCard({ ...card, number: e.target.value })}
                            />

                            <div className="flex gap-3">
                                <Input
                                    placeholder="MM/YY"
                                    value={card.expiry}
                                    onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                                />
                                <Input
                                    placeholder="CVV"
                                    type="password"
                                    value={card.cvv}
                                    onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                                />
                            </div>

                            {/* QR Scanner Placeholder */}
                            <Card className="p-4 text-center border-dashed">
                                📱 Scan QR to Pay (Demo)
                            </Card>
                        </div>

                        <div className="mt-4">
                            <Button
                                className="w-full"
                                onClick={handlePay}
                                disabled={processing}
                            >
                                {processing ? "Processing Payment..." : "Confirm Payment"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <h2 className="text-green-600 text-xl font-semibold">
                            ✅ Payment Successful
                        </h2>
                        <p>Your service has been paid successfully.</p>
                    </div>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default PaymentDialog;
