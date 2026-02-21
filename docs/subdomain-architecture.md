# How Subdomains Work in Greenroom

This guide explains how we use subdomains (like `myfestival.greenroom.app`) in simple English.

## 1. The Main Idea

Instead of building a separate website for every single festival, we have **one main website**. 
When a user visits a link, our system checks the URL. Depending on what is in the URL, the system decides what to show.

## 2. Important Settings 

We use two main settings to make this work:

*   **`NEXT_PUBLIC_APP_URL`**: The full link to our main website (like `https://trizo-greenroom.vercel.app`). We use this to build links, like the one in a "Forgot Password" email.
*   **`NEXT_PUBLIC_MAIN_DOMAIN`**: Just the name of the website (like `trizo-greenroom.vercel.app`). The system uses this to know what the "Main App" is called.

## 3. The Traffic Cop (`src/proxy.ts`)

We have a special file called `proxy.ts`. Think of it as a traffic cop. Before anyone sees any page, the traffic cop stops them and checks their URL.

### A. Checking the URL
When a user visits a link:
*   If the link is `trizo-greenroom.vercel.app`, the cop says: "You want the Main App."
*   If the link has an extra word at the front, like `myfestival.trizo-greenroom.vercel.app`, the cop says: "Ah, `myfestival` is a **Subdomain**!"

### B. Directing Traffic

*   **Public Event Pages (Rewrites):**
    If a user just visits the public festival link (`https://myfestival.trizo-greenroom.vercel.app/`), the cop secretly goes and grabs the content for `myfestival` and shows it to them. The URL in their browser doesn't change, so it looks very clean.

*   **Admin Dashboard (Redirects):**
    Admins manage festivals on a secure page called the dashboard. If an admin tries to visit the dashboard using a subdomain (like `https://myfestival.trizo-greenroom.vercel.app/dashboard`), the cop stops them. The cop says: "You need to be on the secure main domain for that!" and **moves** them to the correct, secure link: `https://trizo-greenroom.vercel.app/dashboard/myfestival`

## 4. Short Summary

*   **Subdomains (`[name].domain.com`)**: These are clean, public websites. They show event details to regular attendees.
*   **Main Domain (`domain.com`)**: This is the secure control center. It handles logins, payments, and the admin dashboard where organizers manage their events.
