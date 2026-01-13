import { Suspense } from "react";
import RecoverPasswordClient from "./RecoverPasswordClient";

export default function RecoverPasswordPage() {
  return (
    <Suspense fallback={null}>
      <RecoverPasswordClient />
    </Suspense>
  );
}
