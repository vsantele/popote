import type { PageServerLoad, Actions } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate, message } from "sveltekit-superforms/server";
import { APIError } from "better-auth/api";
import * as m from "$lib/paraglide/messages";
import { localizeHref } from "$lib/paraglide/runtime";

function signUpSchema() {
  return z.object({
    name: z.string().min(1, m.validation_signup_name_required()).max(100),
    email: z.email(m.validation_email_invalid()),
    password: z.string().min(8, m.validation_password_too_short()),
  });
}

function signInSchema() {
  return z.object({
    email: z.email(m.validation_email_invalid()),
    password: z.string().min(1, m.validation_password_required()),
  });
}

export const load: PageServerLoad = async ({ locals }) => {
  const signUpForm = await superValidate(zod4(signUpSchema()));
  const signInForm = await superValidate(zod4(signInSchema()));

  if (locals.user && !locals.user.isAnonymous) {
    signUpForm.data.name = locals.user.name;
    signUpForm.data.email = locals.user.email ?? "";
  } else if (locals.user?.name && locals.user.name !== "Anonymous") {
    // "Anonymous" is the default identity for anonymous accounts, not a real
    // name — don't prefill it, so the field shows its placeholder instead.
    signUpForm.data.name = locals.user.name;
  }

  return {
    user: locals.user
      ? {
          id: locals.user.id,
          name: locals.user.name,
          email: locals.user.email,
          isAnonymous: locals.user.isAnonymous,
        }
      : null,
    signUpForm,
    signInForm,
  };
};

export const actions: Actions = {
  signUp: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(signUpSchema()));
    if (!form.valid) return fail(400, { form });

    try {
      // The anonymous plugin's onLinkAccount callback will migrate the
      // anonymous user's events/participants to this new user.
      await locals.auth.api.signUpEmail({
        headers: request.headers,
        body: {
          name: form.data.name,
          email: form.data.email,
          password: form.data.password,
        },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return message(form, err.message, { status: 400 });
      }
      console.error("Sign-up failed:", err);
      return message(form, m.error_signup_failed(), { status: 500 });
    }

    throw redirect(303, localizeHref("/"));
  },

  signIn: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(signInSchema()));
    if (!form.valid) return fail(400, { form });

    try {
      await locals.auth.api.signInEmail({
        headers: request.headers,
        body: {
          email: form.data.email,
          password: form.data.password,
        },
      });
    } catch (err) {
      if (err instanceof APIError) {
        return message(form, err.message, { status: 400 });
      }
      console.error("Sign-in failed:", err);
      return message(form, m.error_signin_failed(), { status: 500 });
    }

    throw redirect(303, localizeHref("/"));
  },

  signOut: async ({ request, locals }) => {
    try {
      await locals.auth.api.signOut({ headers: request.headers });
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
    throw redirect(303, localizeHref("/"));
  },
};
