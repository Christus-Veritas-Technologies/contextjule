"use client";

import { Button } from "@contextjule/ui/components/button";
import { Input } from "@contextjule/ui/components/input";
import { useState } from "react";

import { resendDownload } from "@/lib/api";

/**
 * "Send me my link again."
 *
 * The response is the same whether or not the address ever bought anything.
 * That is not laziness — an endpoint that says "no such customer" is an
 * endpoint that will be used to find out who bought what, and there is no
 * account here to protect anyone with afterwards.
 */
export function ResendForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col gap-2 border-3 border-night-rule bg-[#241f2f] p-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="block size-[7px] bg-fresh" />
          <span className="font-pixel text-[10px] text-[#c9c3d4]">check your inbox</span>
        </div>
        <p className="text-[13px] leading-[1.6] text-[#968fa3]">
          If <span className="text-[#c9c3d4]">{email}</span> has a copy, a fresh link and your
          licence key are on the way. Links are good for 72 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!email.trim()) return;
        setPending(true);
        await resendDownload(email.trim());
        setPending(false);
        setSent(true);
      }}
    >
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="the address you bought with"
        aria-label="Your email address"
        className="sm:flex-1"
      />
      <Button type="submit" size="lg" variant="primary" disabled={pending}>
        {pending ? "sending…" : "send my link"}
      </Button>
    </form>
  );
}
