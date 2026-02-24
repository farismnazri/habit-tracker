export default function Head() {
  return (
    <>
      {/* Explicit iOS links: Safari home-screen icon selection can ignore metadata in some builds/caches. */}
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v3.png" />
      <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-v3-167x167.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-v3-152x152.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Habits" />
    </>
  );
}
