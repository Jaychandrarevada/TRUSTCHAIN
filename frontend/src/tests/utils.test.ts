/** Utility tests. */
import { cn, formatPercent, humanizeKey, truncateHash } from "@/utils";

describe("cn", () => {
  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("handles conditionals", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});

describe("truncateHash", () => {
  it("truncates long hashes and keeps short values", () => {
    const hash = "0x" + "ab".repeat(32);
    expect(truncateHash(hash)).toMatch(/^0xabab.*abab$/);
    expect(truncateHash(hash)).toHaveLength(6 + 2 + 1 + 6); // 0x + 6 … 6
    expect(truncateHash("0xabcd")).toBe("0xabcd");
    expect(truncateHash(null)).toBe("—");
  });
});

describe("humanizeKey", () => {
  it("turns snake_case into Title Case", () => {
    expect(humanizeKey("holder_name")).toBe("Holder Name");
  });
});

describe("formatPercent", () => {
  it("renders fractions as percentages", () => {
    expect(formatPercent(0.667)).toBe("66.7%");
    expect(formatPercent(0)).toBe("0%");
  });
});
