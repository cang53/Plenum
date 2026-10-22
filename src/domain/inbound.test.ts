import { describe, expect, it } from "vitest";
import { projectSlugsFor, rawEmailLocation } from "./inbound";

describe("projectSlugsFor", () => {
  const domain = "in.plenum.example";

  it("keeps only addresses on the inbound domain", () => {
    expect(
      projectSlugsFor(["pia@example.com", "Line4-Ghent@IN.plenum.example", "bridge-a12@in.plenum.example"], domain),
    ).toEqual(["line4-ghent", "bridge-a12"]);
  });

  it("ignores look-alike domains and malformed local parts", () => {
    expect(projectSlugsFor(["a1@evil-in.plenum.example", "-bad@in.plenum.example", "x@in.plenum.example"], domain)).toEqual(
      [],
    );
  });

  it("folds plus addressing and duplicates into one project", () => {
    expect(projectSlugsFor(["line4+urgent@in.plenum.example", "line4@in.plenum.example"], domain)).toEqual(["line4"]);
  });
});

describe("rawEmailLocation", () => {
  it("reads the S3 action and refuses others", () => {
    expect(rawEmailLocation({ type: "S3", bucketName: "inbound", objectKey: "abc" })).toEqual({
      bucket: "inbound",
      key: "abc",
    });
    expect(rawEmailLocation({ type: "SNS" })).toBeNull();
  });
});
