const MAIN_DOMAIN = "trizo-greenroom.vercel.app";

function testDomain(host) {
  const isMainDomain = host === MAIN_DOMAIN;

  let subdomain = null;
  if (!isMainDomain && host.endsWith(`.${MAIN_DOMAIN}`)) {
    subdomain = host.replace(`.${MAIN_DOMAIN}`, "");
  } else if (!isMainDomain && host.includes("localhost")) {
    subdomain = host.split(".")[0];
  }

  console.log(
    `Host: ${host} | isMainDomain: ${isMainDomain} | Subdomain: ${subdomain}`,
  );
}

testDomain("trizo-greenroom.vercel.app");
testDomain("myfestival.trizo-greenroom.vercel.app");
testDomain("another-test.trizo-greenroom.vercel.app");
testDomain("localhost:3000");
testDomain("myfestival.localhost:3000");
