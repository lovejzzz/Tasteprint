import "@testing-library/jest-dom/vitest";

// Polyfill missing DOM APIs for jsdom
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = function () {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function () {};
