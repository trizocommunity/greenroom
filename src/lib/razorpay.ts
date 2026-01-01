export const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    // Check if already loaded
    if ((window as any).Razorpay) {
      return resolve(true);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
