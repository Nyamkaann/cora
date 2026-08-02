"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserForm } from "./UserForm";

export function NewUserPanel() {
  const t = useTranslations("Users");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        {t("newUser")}
      </Button>
    );
  }

  return (
    <Card>
      <UserForm onDone={() => setOpen(false)} />
    </Card>
  );
}
