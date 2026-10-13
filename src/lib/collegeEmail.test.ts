import { describe, expect, it } from "vitest";
import {
  collegeEmailError,
  collegeSuffixList,
  emailDomain,
  isCollegeDomain,
  isCollegeEmail,
  MAX_EMAIL_LENGTH,
} from "./collegeEmail";

describe("isCollegeDomain", () => {
  it("accepts Indian institutional domains", () => {
    for (const domain of ["iitb.ac.in", "vit.ac.in", "college.edu.in", "iisc.ac.in", "csio.res.in"]) {
      expect(isCollegeDomain(domain)).toBe(true);
    }
  });

  it("accepts academic domains outside India without listing every country", () => {
    for (const domain of ["mit.edu", "ox.ac.uk", "unimelb.edu.au", "u-tokyo.ac.jp"]) {
      expect(isCollegeDomain(domain)).toBe(true);
    }
  });

  it("rejects consumer mailboxes", () => {
    for (const domain of ["gmail.com", "outlook.com", "yahoo.co.in", "icloud.com"]) {
      expect(isCollegeDomain(domain)).toBe(false);
    }
  });

  it("rejects ordinary company and government domains", () => {
    for (const domain of ["amazon.com", "mycollege.com", "nic.in", "education.org"]) {
      expect(isCollegeDomain(domain)).toBe(false);
    }
  });

  it("is not fooled by a college suffix in the middle of a domain", () => {
    expect(isCollegeDomain("ac.in.example.com")).toBe(false);
    expect(isCollegeDomain("notareal.edu.phishing.net")).toBe(false);
  });
});

describe("emailDomain", () => {
  it("takes everything after the last @, lowercased", () => {
    expect(emailDomain("  Asha@IITB.AC.IN ")).toBe("iitb.ac.in");
    expect(emailDomain("no-at-sign")).toBe("");
  });
});

describe("collegeEmailError", () => {
  it("treats a blank address as acceptable — the field is optional", () => {
    expect(collegeEmailError("")).toBeNull();
    expect(collegeEmailError("   ")).toBeNull();
  });

  it("accepts a college address", () => {
    expect(collegeEmailError("asha@iitb.ac.in")).toBeNull();
    expect(collegeEmailError(" asha@college.edu.in ")).toBeNull();
  });

  it("explains why a personal address is refused, by name", () => {
    const message = collegeEmailError("asha@gmail.com");
    expect(message).toContain("gmail.com");
    expect(message).toMatch(/college address/i);
  });

  it("names the accepted endings when the domain isn't academic", () => {
    const message = collegeEmailError("asha@mycollege.com");
    expect(message).toContain("mycollege.com");
    expect(message).toContain(".ac.in");
  });

  it("rejects a malformed address before looking at the domain", () => {
    expect(collegeEmailError("asha@@iitb.ac.in")).toMatch(/valid email/i);
    expect(collegeEmailError("asha at iitb.ac.in")).toMatch(/valid email/i);
    expect(collegeEmailError("asha@iitbacin")).toMatch(/valid email/i);
  });

  it("rejects an address longer than the RFC limit", () => {
    const long = `${"a".repeat(MAX_EMAIL_LENGTH)}@iitb.ac.in`;
    expect(collegeEmailError(long)).toMatch(/too long/i);
  });
});

describe("isCollegeEmail", () => {
  it("agrees with collegeEmailError, except on a blank value", () => {
    expect(isCollegeEmail("")).toBe(false);
    expect(isCollegeEmail("asha@iitb.ac.in")).toBe(true);
    expect(isCollegeEmail("asha@gmail.com")).toBe(false);
  });
});

describe("collegeSuffixList", () => {
  it("reads as a sentence", () => {
    expect(collegeSuffixList()).toBe(".ac.in, .edu.in, .res.in or .edu");
    expect(collegeSuffixList("and")).toContain("and .edu");
  });
});
