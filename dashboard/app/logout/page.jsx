"use client";

import { useEffect } from "react";

export default function LogoutPage() {

  useEffect(() => {
    // Hapus cookie token
    document.cookie = "gg_token=; path=/; max-age=0;";

    // Redirect ke login
    window.location.href = "/login";
  }, []);

  return (
    <div className="p-6 text-center text-xl">
      Logging out...
    </div>
  );
}
