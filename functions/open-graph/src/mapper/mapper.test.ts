import type { OpenGraphInfo } from "./types.ts";

import { assertEquals } from "std/testing/asserts";
import mapper from "./mapper.ts";

Deno.test("mapper test", () => {
  const given = {
    ogTitle: "Open Graph protocol",
    ogType: "website",
    ogUrl: "http://ogp.me/",
    ogDescription:
      "The Open Graph protocol enables any web page to become a rich object in a social graph.",
    ogImage: {
      url: "http://ogp.me/logo.png",
      width: "300",
      height: "300",
      type: "image/png",
    },
    requestUrl: "http://ogp.me/",
    success: true,
  };
  const actual = mapper(given);

  const expected: OpenGraphInfo = {
    title: "Open Graph protocol",
    description:
      "The Open Graph protocol enables any web page to become a rich object in a social graph.",
    url: "http://ogp.me/",
    locale: undefined,
    site: undefined,
    image: "http://ogp.me/logo.png",
  };
  assertEquals(actual, expected);
});
