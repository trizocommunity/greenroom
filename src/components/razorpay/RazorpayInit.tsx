"use client";

import { useEffect } from "react";

export function RazorpayInit() {
  useEffect(() => {
    (window as any).rzp_key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  }, []);

  return null;
}
