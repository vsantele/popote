<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card"
  import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
  } from "$lib/components/ui/tabs"
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import { superForm } from "sveltekit-superforms/client"
  import * as m from "$lib/paraglide/messages"
  import { localizeHref } from "$lib/paraglide/runtime"
  import type { PageProps } from "./$types"
  import LocaleSwitcher from "$lib/components/locale-switcher.svelte"
  import BrandMark from "$lib/components/brand-mark.svelte"

  let { data }: PageProps = $props()

  const {
    form: signUpForm,
    errors: signUpErrors,
    message: signUpMessage,
    enhance: signUpEnhance,
    delayed: signUpDelayed,
    // svelte-ignore state_referenced_locally
  } = superForm(data.signUpForm, {
    id: "signUp",
    resetForm: false,
  })

  const {
    form: signInForm,
    errors: signInErrors,
    message: signInMessage,
    enhance: signInEnhance,
    delayed: signInDelayed,
    // svelte-ignore state_referenced_locally
  } = superForm(data.signInForm, {
    id: "signIn",
    resetForm: false,
  })

  const isLoggedIn = $derived(!!data.user && !data.user.isAnonymous)
  const isAnonymous = $derived(!!data.user && data.user.isAnonymous)

  // Anonymous guests benefit most from creating an account (it keeps their
  // existing events); fully logged-out visitors most likely already have one.
  // svelte-ignore state_referenced_locally
  let activeTab = $state(data.user && !data.user.isAnonymous ? "signin" : "signup")
</script>

<div class="min-h-screen px-4 pb-16">
  <div class="mx-auto w-full max-w-md">
    <div class="flex items-center justify-between gap-2 pt-4">
      <Button href={localizeHref("/")} variant="ghost" size="sm">
        {m.nav_back_home()}
      </Button>
      <LocaleSwitcher />
    </div>

    <div class="animate-pop-in flex flex-col items-center pt-6 pb-7 text-center">
      <BrandMark size={72} class="drop-shadow-sm" />
      <h1 class="font-display mt-3 text-4xl font-semibold tracking-tight">
        {#if isLoggedIn}
          {m.account_title_signed_in()}
        {:else}
          {m.account_title_guest()}
        {/if}
      </h1>
      <p class="mt-2 max-w-xs text-pretty text-muted-foreground">
        {#if isLoggedIn}
          {m.account_intro_signed_in()}
        {:else if isAnonymous}
          {m.account_intro_anonymous()}
        {:else}
          {m.account_intro_loggedout()}
        {/if}
      </p>
    </div>

    {#if isLoggedIn}
      <Card class="animate-pop-in" style="animation-delay:60ms">
        <CardHeader>
          <CardTitle>{data.user?.name}</CardTitle>
          <p class="text-sm text-muted-foreground">{data.user?.email}</p>
        </CardHeader>
        <CardContent>
          <form method="POST" action="?/signOut">
            <Button type="submit" variant="outline" class="w-full">
              {m.account_signout_button()}
            </Button>
          </form>
        </CardContent>
      </Card>
    {:else}
      {#if isAnonymous}
        <div
          class="animate-pop-in card-pop mb-4 rounded-2xl bg-accent/40 px-4 py-3 text-sm text-accent-foreground"
        >
          {m.account_carryover_note()}
        </div>
      {/if}

      <Tabs bind:value={activeTab} class="animate-pop-in" style="animation-delay:60ms">
        <TabsList>
          <TabsTrigger value="signup">{m.account_tab_signup()}</TabsTrigger>
          <TabsTrigger value="signin">{m.account_tab_signin()}</TabsTrigger>
        </TabsList>

        <TabsContent value="signup">
          <Card>
            <CardContent class="px-6">
              <form
                method="POST"
                action="?/signUp"
                use:signUpEnhance
                class="space-y-4"
              >
                <div class="space-y-2">
                  <Label for="signup-name">{m.account_field_name_label()}</Label>
                  <Input
                    id="signup-name"
                    name="name"
                    bind:value={$signUpForm.name}
                    placeholder={m.account_field_name_placeholder()}
                    required
                    aria-invalid={$signUpErrors.name ? "true" : undefined}
                  />
                  {#if $signUpErrors.name}
                    <p class="text-sm text-destructive">{$signUpErrors.name}</p>
                  {/if}
                </div>

                <div class="space-y-2">
                  <Label for="signup-email">{m.account_field_email_label()}</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    bind:value={$signUpForm.email}
                    placeholder={m.account_field_email_placeholder()}
                    required
                    aria-invalid={$signUpErrors.email ? "true" : undefined}
                  />
                  {#if $signUpErrors.email}
                    <p class="text-sm text-destructive">{$signUpErrors.email}</p>
                  {/if}
                </div>

                <div class="space-y-2">
                  <Label for="signup-password"
                    >{m.account_field_password_label()}</Label
                  >
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    bind:value={$signUpForm.password}
                    placeholder={m.account_field_password_placeholder()}
                    required
                    aria-invalid={$signUpErrors.password ? "true" : undefined}
                  />
                  {#if $signUpErrors.password}
                    <p class="text-sm text-destructive">
                      {$signUpErrors.password}
                    </p>
                  {/if}
                </div>

                {#if $signUpMessage}
                  <p class="text-sm text-destructive">{$signUpMessage}</p>
                {/if}

                <Button type="submit" class="w-full" disabled={$signUpDelayed}>
                  {$signUpDelayed
                    ? m.create_submitting()
                    : m.account_signup_submit()}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signin">
          <Card>
            <CardContent class="px-6">
              <form
                method="POST"
                action="?/signIn"
                use:signInEnhance
                class="space-y-4"
              >
                <div class="space-y-2">
                  <Label for="signin-email">{m.account_signin_email_label()}</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    bind:value={$signInForm.email}
                    placeholder={m.account_field_email_placeholder()}
                    required
                    aria-invalid={$signInErrors.email ? "true" : undefined}
                  />
                  {#if $signInErrors.email}
                    <p class="text-sm text-destructive">{$signInErrors.email}</p>
                  {/if}
                </div>

                <div class="space-y-2">
                  <Label for="signin-password"
                    >{m.account_signin_password_label()}</Label
                  >
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    bind:value={$signInForm.password}
                    required
                    aria-invalid={$signInErrors.password ? "true" : undefined}
                  />
                  {#if $signInErrors.password}
                    <p class="text-sm text-destructive">
                      {$signInErrors.password}
                    </p>
                  {/if}
                </div>

                {#if $signInMessage}
                  <p class="text-sm text-destructive">{$signInMessage}</p>
                {/if}

                <Button
                  type="submit"
                  class="w-full"
                  disabled={$signInDelayed}
                >
                  {$signInDelayed
                    ? m.account_signin_submitting()
                    : m.account_signin_submit()}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    {/if}

    {#if data.user}
      <div class="pt-8 text-center">
        <details class="text-xs text-muted-foreground">
          <summary class="cursor-pointer hover:underline">
            {m.account_advanced_summary()}
          </summary>
          <div class="mt-2 p-2 bg-muted rounded break-all font-mono space-y-1">
            <div>{m.account_advanced_user_id({ id: data.user.id })}</div>
            <div>
              {data.user.isAnonymous
                ? m.account_advanced_anonymous_yes()
                : m.account_advanced_anonymous_no()}
            </div>
          </div>
        </details>
      </div>
    {/if}
  </div>
</div>
