import React, { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import Btn from "./Btn";
import { C } from "../theme/colors";

function CardForm({ onSuccess, onProcessing, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/confirmation` },
      redirect: "if_required",
    });
    setSubmitting(false);
    if (error) return onError(error.message || "Your card payment could not be completed.");
    if (paymentIntent?.status === "succeeded") return onSuccess();
    if (paymentIntent?.status === "processing") return onProcessing();
    onError("Your card payment is still awaiting confirmation.");
  };

  return (
    <form onSubmit={submit} className="rounded-xl p-4 flex flex-col gap-3" style={{ border: `1px solid ${C.lightGray}` }}>
      <PaymentElement options={{ layout: "tabs" }} />
      <Btn full type="submit" disabled={!stripe || submitting}>{submitting ? "Processing payment…" : "Pay securely by card"}</Btn>
    </form>
  );
}

export default function StripeCheckoutForm({ stripePromise, clientSecret, onSuccess, onProcessing, onError }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <CardForm onSuccess={onSuccess} onProcessing={onProcessing} onError={onError} />
    </Elements>
  );
}
