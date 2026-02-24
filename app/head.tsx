export default function Head() {
  return (
    <>
      {/* iOS Safari can be stubborn here: include explicit legacy + sized links. */}
      <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
      <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png?v=4" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v3.png?v=4" />
      <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-v3-167x167.png?v=4" />
      <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-v3-152x152.png?v=4" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Habits" />
    </>
  );
}
