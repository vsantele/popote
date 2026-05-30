<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog"
  import { Button } from "$lib/components/ui/button"
  import { QrCode } from "@lucide/svelte"
  import * as m from "$lib/paraglide/messages"
  import QRCodeLib from "qrcode-svg"

  interface Props {
    url: string
    eventName: string
  }

  let { url, eventName }: Props = $props()

  let open = $state(false)

  function buildQrSvg(content: string): string {
    const qr = new QRCodeLib({
      content,
      width: 256,
      height: 256,
      padding: 4,
      color: "#2d2416",
      background: "#fdf8f2",
      ecl: "M",
      join: true,
      container: "svg",
    })
    return qr.svg()
  }

  const qrSvg = $derived(buildQrSvg(url))
</script>

<Button
  variant="outline"
  size="icon"
  onclick={() => (open = true)}
  aria-label={m.event_qr_button_label()}
  data-testid="qr-trigger"
>
  <QrCode size={18} />
</Button>

<Dialog bind:open>
  <DialogContent>
    <DialogHeader>
      <DialogTitle class="font-display text-xl">
        {m.event_qr_dialog_title({ name: eventName })}
      </DialogTitle>
    </DialogHeader>
    <div class="flex flex-col items-center gap-4 py-2">
      <div
        class="overflow-hidden rounded-2xl border-[1.5px] border-border/60 bg-[#fdf8f2] p-3 shadow-sm"
        data-testid="qr-code"
        role="img"
        aria-label={m.event_qr_image_label({ url })}
      >
        {@html qrSvg}
      </div>
      <p class="max-w-[260px] break-all text-center text-xs text-muted-foreground">
        {url}
      </p>
    </div>
  </DialogContent>
</Dialog>
