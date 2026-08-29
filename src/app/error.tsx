"use client";

export default function Error({ reset }: { reset: () => void }) { return <main className="main" role="alert"><h1>Something went wrong</h1><p>We could not load this storefront.</p><button type="button" onClick={reset}>Try again</button></main>; }
