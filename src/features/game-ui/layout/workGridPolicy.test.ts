import { describe, it, expect } from "vitest";
import {
  getContainerWidthBucket,
  getWorkGridLayout,
} from "./workGridPolicy";

describe("workGridPolicy", () => {
  describe("getContainerWidthBucket", () => {
    it("returns mobile for width < 1024", () => {
      expect(getContainerWidthBucket(375)).toBe("mobile");
      expect(getContainerWidthBucket(768)).toBe("mobile");
      expect(getContainerWidthBucket(1023)).toBe("mobile");
    });

    it("returns desktop for width >= 1024", () => {
      expect(getContainerWidthBucket(1024)).toBe("desktop");
      expect(getContainerWidthBucket(1280)).toBe("desktop");
      expect(getContainerWidthBucket(1660)).toBe("desktop");
    });
  });

  describe("getWorkGridLayout", () => {
    describe("stacked layout (1-3 cards)", () => {
      it("returns 1 column layout for 1 card", () => {
        const layout = getWorkGridLayout(1, 1280);
        expect(layout.columns).toBe(1);
        expect(layout.density).toBe("normal");
        expect(layout.items).toHaveLength(1);
        expect(layout.items[0]).toEqual({
          index: 0,
          column: 1,
          row: 1,
          columnSpan: 1,
          centered: false,
        });
      });

      it("returns 1 column layout for 3 cards", () => {
        const layout = getWorkGridLayout(3, 1280);
        expect(layout.columns).toBe(1);
        expect(layout.items).toHaveLength(3);
        expect(layout.items[2].row).toBe(3);
      });
    });

    describe("4 cards layout", () => {
      it("returns 2x2 grid for mobile", () => {
        const layout = getWorkGridLayout(4, 768);
        expect(layout.columns).toBe(2);
        expect(layout.density).toBe("normal");
        expect(layout.items).toHaveLength(4);
        expect(layout.items.every((item) => !item.centered)).toBe(true);
      });

      it("returns 2x2 grid for desktop", () => {
        const layout = getWorkGridLayout(4, 1280);
        expect(layout.columns).toBe(2);
        expect(layout.items).toHaveLength(4);
      });
    });

    describe("5 cards layout (2+2+1 centered)", () => {
      it("centers 5th card on mobile", () => {
        const layout = getWorkGridLayout(5, 768);
        expect(layout.columns).toBe(2);
        expect(layout.items).toHaveLength(5);

        const fifthCard = layout.items[4];
        expect(fifthCard.centered).toBe(true);
        expect(fifthCard.columnSpan).toBe(2);
        expect(fifthCard.row).toBe(3);
      });

      it("centers 5th card on desktop", () => {
        const layout = getWorkGridLayout(5, 1280);
        expect(layout.columns).toBe(2);
        const fifthCard = layout.items[4];
        expect(fifthCard.centered).toBe(true);
        expect(fifthCard.columnSpan).toBe(2);
      });
    });

    describe("6 cards layout", () => {
      it("returns 2x3 grid for mobile", () => {
        const layout = getWorkGridLayout(6, 768);
        expect(layout.columns).toBe(2);
        expect(layout.items).toHaveLength(6);
        expect(layout.items.every((item) => !item.centered)).toBe(true);
      });

      it("returns 3x2 grid for desktop", () => {
        const layout = getWorkGridLayout(6, 1280);
        expect(layout.columns).toBe(3);
        expect(layout.items).toHaveLength(6);
        expect(layout.items[5]).toEqual({
          index: 5,
          column: 3,
          row: 2,
          columnSpan: 1,
          centered: false,
        });
      });
    });

    describe("7 cards layout (3+3+1 centered)", () => {
      it("centers 7th card on mobile with 2 columns", () => {
        const layout = getWorkGridLayout(7, 768);
        expect(layout.columns).toBe(2);
        expect(layout.density).toBe("normal");
        expect(layout.items).toHaveLength(7);

        const seventhCard = layout.items[6];
        expect(seventhCard.centered).toBe(true);
        expect(seventhCard.columnSpan).toBe(2);
        expect(seventhCard.row).toBe(4);
      });

      it("centers 7th card on desktop with 3 columns and dense mode", () => {
        const layout = getWorkGridLayout(7, 1280);
        expect(layout.columns).toBe(3);
        expect(layout.density).toBe("dense");
        expect(layout.items).toHaveLength(7);

        const seventhCard = layout.items[6];
        expect(seventhCard.centered).toBe(true);
        expect(seventhCard.column).toBe(2);
        expect(seventhCard.row).toBe(3);
        expect(seventhCard.columnSpan).toBe(1);
      });

      it("applies dense mode on large desktop (1660px)", () => {
        const layout = getWorkGridLayout(7, 1660);
        expect(layout.density).toBe("dense");
      });
    });

    describe("8 cards layout (3+3+1+1 centered)", () => {
      it("returns 2x4 grid for mobile (no centered cards)", () => {
        const layout = getWorkGridLayout(8, 768);
        expect(layout.columns).toBe(2);
        expect(layout.density).toBe("normal");
        expect(layout.items).toHaveLength(8);
        expect(layout.items.every((item) => !item.centered)).toBe(true);

        const seventhCard = layout.items[6];
        expect(seventhCard.column).toBe(1);
        expect(seventhCard.row).toBe(4);

        const eighthCard = layout.items[7];
        expect(eighthCard.column).toBe(2);
        expect(eighthCard.row).toBe(4);
      });

      it("centers 7th and 8th cards on desktop with 3 columns and dense mode", () => {
        const layout = getWorkGridLayout(8, 1280);
        expect(layout.columns).toBe(3);
        expect(layout.density).toBe("dense");
        expect(layout.items).toHaveLength(8);

        const seventhCard = layout.items[6];
        expect(seventhCard.centered).toBe(true);
        expect(seventhCard.column).toBe(2);
        expect(seventhCard.row).toBe(3);

        const eighthCard = layout.items[7];
        expect(eighthCard.centered).toBe(true);
        expect(eighthCard.column).toBe(2);
        expect(eighthCard.row).toBe(4);
      });

      it("applies dense mode on large desktop (1660px)", () => {
        const layout = getWorkGridLayout(8, 1660);
        expect(layout.density).toBe("dense");
        expect(layout.items[6].centered).toBe(true);
        expect(layout.items[7].centered).toBe(true);
      });
    });

    describe("spec compliance", () => {
      it("never has overlapping row/column positions", () => {
        const testCases = [
          { cards: 5, width: 768 },
          { cards: 7, width: 1280 },
          { cards: 8, width: 1660 },
        ];

        testCases.forEach(({ cards, width }) => {
          const layout = getWorkGridLayout(cards, width);

          // Centered items can share positions (they span columns)
          const nonCenteredPositions = layout.items
            .filter((item) => !item.centered)
            .map((item) => `${item.row}-${item.column}`);
          const uniqueNonCentered = new Set(nonCenteredPositions);

          expect(nonCenteredPositions.length).toBe(uniqueNonCentered.size);
        });
      });

      it("all items have valid row/column values", () => {
        const layouts = [
          getWorkGridLayout(5, 768),
          getWorkGridLayout(7, 1280),
          getWorkGridLayout(8, 1660),
        ];

        layouts.forEach((layout) => {
          layout.items.forEach((item) => {
            expect(item.row).toBeGreaterThan(0);
            expect(item.column).toBeGreaterThan(0);
            expect(item.column).toBeLessThanOrEqual(layout.columns);
            expect(item.columnSpan).toBeGreaterThan(0);
          });
        });
      });

      it("centered items span multiple columns when columns > 1", () => {
        const layout7 = getWorkGridLayout(7, 768);
        const centered7 = layout7.items.filter((item) => item.centered);
        expect(centered7.every((item) => item.columnSpan === layout7.columns)).toBe(true);

        const layout5 = getWorkGridLayout(5, 1280);
        const centered5 = layout5.items.filter((item) => item.centered);
        expect(centered5.every((item) => item.columnSpan === layout5.columns)).toBe(true);
      });
    });
  });
});
