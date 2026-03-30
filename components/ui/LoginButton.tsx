"use client";
import { signIn } from "next-auth/react";
import { LuGithub } from "react-icons/lu";

export function LoginButton() {
  return (
    <button
      onClick={() => signIn("github")}
      className="w-full bg-accent hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
    >
      <LuGithub size={20} />
      Continue with GitHub
    </button>
  );
}
