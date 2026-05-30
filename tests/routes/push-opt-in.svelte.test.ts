import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { render, screen, waitFor } from "@testing-library/svelte";
import PushOptIn from "../../src/lib/components/push-opt-in.svelte";

// Control the client push helpers so we can drive the component into each state
// without a real PushManager.
const {
  isPushSupportedMock,
  getExistingSubscriptionMock,
  subscribeToPushMock,
  unsubscribeFromPushMock,
} = vi.hoisted(() => ({
  isPushSupportedMock: vi.fn(),
  getExistingSubscriptionMock: vi.fn(),
  subscribeToPushMock: vi.fn(),
  unsubscribeFromPushMock: vi.fn(),
}));

vi.mock("../../src/lib/push/client", () => ({
  isPushSupported: isPushSupportedMock,
  getExistingSubscription: getExistingSubscriptionMock,
  subscribeToPush: subscribeToPushMock,
  unsubscribeFromPush: unsubscribeFromPushMock,
}));

const KEY = "BPUBLICKEY";

function setPermission(value: NotificationPermission) {
  // jsdom may not define Notification; provide a minimal stub.
  globalThis.Notification = {
    permission: value,
    requestPermission: vi.fn().mockResolvedValue("granted"),
  } as unknown as typeof Notification;
}

beforeEach(() => {
  isPushSupportedMock.mockReset();
  getExistingSubscriptionMock.mockReset();
  subscribeToPushMock.mockReset();
  unsubscribeFromPushMock.mockReset();
  isPushSupportedMock.mockReturnValue(true);
  getExistingSubscriptionMock.mockResolvedValue(null);
  setPermission("default");
});

describe("PushOptIn", () => {
  it("renders nothing when push is disabled server-side (no key)", async () => {
    const { container } = render(PushOptIn, {
      props: { vapidPublicKey: null },
    });
    // unsupported state hides the whole control
    await waitFor(() => {
      expect(container.querySelector("[data-push-state]")).toBeNull();
    });
  });

  it("renders nothing when the browser does not support push", async () => {
    isPushSupportedMock.mockReturnValue(false);
    const { container } = render(PushOptIn, {
      props: { vapidPublicKey: KEY },
    });
    await waitFor(() => {
      expect(container.querySelector("[data-push-state]")).toBeNull();
    });
  });

  it("shows the enable button in the idle state", async () => {
    const { container } = render(PushOptIn, {
      props: { vapidPublicKey: KEY },
    });
    await waitFor(() => {
      expect(container.querySelector('[data-push-state="idle"]')).not.toBeNull();
    });
    expect(
      screen.getByRole("button", {
        name: /enable reminders|activer les rappels/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows the disable button when already subscribed", async () => {
    getExistingSubscriptionMock.mockResolvedValue({
      endpoint: "x",
    } as unknown as PushSubscription);
    const { container } = render(PushOptIn, {
      props: { vapidPublicKey: KEY },
    });
    await waitFor(() => {
      expect(
        container.querySelector('[data-push-state="subscribed"]'),
      ).not.toBeNull();
    });
    expect(
      screen.getByRole("button", {
        name: /turn off reminders|désactiver les rappels/i,
      }),
    ).toBeInTheDocument();
  });

  it("shows the denied message when permission is blocked", async () => {
    setPermission("denied");
    const { container } = render(PushOptIn, {
      props: { vapidPublicKey: KEY },
    });
    await waitFor(() => {
      expect(
        container.querySelector('[data-push-state="denied"]'),
      ).not.toBeNull();
    });
  });
});
