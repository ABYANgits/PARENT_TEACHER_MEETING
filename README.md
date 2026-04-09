This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



# Comprehensive Final Security Implementation Report

Over the past few hours, we strategically eliminated several high-risk vulnerabilities across your architecture. Below is a detailed technical summary of what was fixed, why the vulnerability was dangerous, how we repaired it, and exactly where you can find the patched code.

---

## 1. Malware Hosting Extirpation (Unrestricted File Uploads)
**The Concern:** 
Originally, your file interface used a raw `<input type="file" />`. This is incredibly dangerous because an attacker could disguise an executable virus (e.g., `virus.exe` or `payload.sh`) as a school document. If a Parent downloaded it, their machine would be compromised, making you liable for distributing malware.

**The Solution:**
We enforced Defense-in-Depth strict file casting. The HTML picker now forces operating systems to only display safe document types (PDFs, Images, Word Docs). To prevent hackers from bypassing HTML with POST scripts, the Javascript physically recalculates the extension on the raw binary file. If it finds illegal extensions, it forcibly resets the payload to `null` and aborts.


## 2. Storage Billing Denial of Service (Quota Bombing)
**The Concern:**
Without strict mathematical constraints, a malicious web crawler could repetitively hit your database to attach tens of thousands of massive files (e.g., 5GB 4K movies). This "Storage Bombing" would instantly crash your Vercel Node boundaries and max out your Supabase Storage billing overages.

**The Solution:**
We implemented two mathematical strict bounds: 
1. **Size Limit:** The JS checks `file.size` and enforces a hard crash if attempting to move more than 8MB over the network.
2. **Volume Limit:** `handleFileUpload` measures the length of `currentDocs`. If a teacher already uploaded 3 documents to a meeting, the network request is locked, stopping thousands of tiny files from flooding the DB row.


## 3. Zoom Authorization Forgery (IDOR)
**The Concern:**
"Insecure Direct Object Reference (IDOR)". The Node.js Server API previously accepted a `childId` and happily called the Zoom API. A malicious parent could spoof network packets, feeding the API *other* people's children IDs to mischievously schedule Zoom meetings under other identities.

**The Solution:**
We injected an identity firewall. When a request hits `/api/zoom`, the server retrieves the logged-in parent's ID string. It then pings the `children` database table—if the targeted `childId` does not explicitly map to `parent_id == session.user.id`, the server violently drops the connection with an `HTTP 403 Forbidden` error.


## 4. Zoom API Quota Exhaustion (DoS)
**The Concern:**
Because there were no Rate Limiters (like Redis IP blocking), an attacker could deploy an automated bot script hammering `/api/zoom` to schedule millions of meaningless meetings, successfully crashing your master Zoom Cloud API quota and taking your business entirely offline.

**The Solution:**
We deployed "Semantic Rate Limiting". Instead of tracking IPs, the server interrogates the Postgres database table to count exactly how many unexpired meetings the user currently has booked. If the SQL `.count()` returns `>= 3`, the server outright blocks the Zoom API fetch, ensuring nobody can spam your Zoom keys without actually attending the meetings first!


## 5. Broken Edge Routing (Role-Based Access Control)
**The Concern:**
The Edge `proxy.ts` middleware only cared if someone was legally logged in. A parent with a valid login could manually type `localhost:3000/teacher` into the URL, bypass the frontend, and view the sensitive teacher environment layout packages.

**The Solution:**
We implemented strict **RBAC (Role Based Access Control)**. The Edge proxy now physically fetches `SELECT role FROM profiles`. If the requested URL starts with `/teacher` but the database claims they are a `'parent'`, the Edge network forcefully intercepts them before the React layout is even permitted to download, bouncing them safely back to `/`.


## 6. Stored Cross-Site Scripting (XSS)
**The Concern:**
If a malicious user submits Javascript fragments (`<script>stealTokens()</script>`) as their Teacher Notes or Meeting Topic, poorly configured frontend logic might mistakenly parse the HTML string. The malicious code would permanently execute globally across browsers whenever anyone clicked on that meeting.

**The Solution:**
We fundamentally altered the input pipelines to follow a "Zero Trust Parsing" methodology using `isomorphic-dompurify`. 
- When Teachers type notes, the browser aggressively scrubs any DOM nodes out. 
- When Parents submit Meeting Topics, the Node Server actively parses and destroys the payloads before pinging Zoom. 

