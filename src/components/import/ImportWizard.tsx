"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  parseWorkbookAction,
  importProductsAction,
  type ParseWorkbookState,
  type ParsedSheet,
  type ImportRowInput,
  type ImportReport,
} from "@/lib/actions/import";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

const TARGET_FIELDS = [
  { key: "name", labelKey: "fieldName", required: true },
  { key: "sku", labelKey: "fieldSku", required: false },
  { key: "categoryName", labelKey: "fieldCategory", required: false },
  { key: "brandName", labelKey: "fieldBrand", required: false },
  { key: "unit", labelKey: "fieldUnit", required: false },
  { key: "costPrice", labelKey: "fieldCostPrice", required: false },
  { key: "sellPrice", labelKey: "fieldSellPrice", required: false },
  { key: "stockQty", labelKey: "fieldStockQty", required: false },
] as const;

type FieldKey = (typeof TARGET_FIELDS)[number]["key"];
type Mapping = Record<FieldKey, string>;

const GUESS_KEYWORDS: Record<FieldKey, string[]> = {
  name: ["бүтээгдэхүүний нэр", "нэр", "name", "product"],
  sku: ["sku", "код"],
  categoryName: ["төрөл", "ангилал", "category", "type"],
  brandName: ["brand", "брэнд"],
  unit: ["хэмжих нэгж", "unit"],
  costPrice: ["нэгж өртөг", "өртөг", "cost"],
  sellPrice: ["зарах үнэ", "sell", "price"],
  stockQty: ["үлдэгдэл", "stock", "qty", "quantity"],
};

function guessMapping(headers: string[]): Mapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (keywords: string[]) => {
    for (const kw of keywords) {
      const idx = lower.findIndex((h) => h.includes(kw));
      if (idx !== -1) return headers[idx];
    }
    return "";
  };
  return {
    name: find(GUESS_KEYWORDS.name),
    sku: find(GUESS_KEYWORDS.sku),
    categoryName: find(GUESS_KEYWORDS.categoryName),
    brandName: find(GUESS_KEYWORDS.brandName),
    unit: find(GUESS_KEYWORDS.unit),
    costPrice: find(GUESS_KEYWORDS.costPrice),
    sellPrice: find(GUESS_KEYWORDS.sellPrice),
    stockQty: find(GUESS_KEYWORDS.stockQty),
  };
}

function buildRows(sheet: ParsedSheet, mapping: Mapping): ImportRowInput[] {
  return sheet.rows.map((row, index) => {
    const mapped: ImportRowInput = { rowNumber: index + 1 };
    for (const field of TARGET_FIELDS) {
      const header = mapping[field.key];
      if (header) mapped[field.key] = row[header];
    }
    return mapped;
  });
}

const PARSE_ERROR_KEYS: Record<string, string> = {
  no_file: "errorNoFile",
  invalid_file_type: "errorInvalidFileType",
  parse_failed: "errorParseFailed",
  empty_workbook: "errorEmptyWorkbook",
};

const IMPORT_ERROR_KEYS: Record<string, string> = {
  no_rows: "errorNoRows",
  too_many_rows: "errorTooManyRows",
};

const REASON_KEYS: Record<string, string> = {
  invalid: "reasonInvalid",
  duplicate_in_file: "reasonDuplicateInFile",
  duplicate_in_db: "reasonDuplicateInDb",
};

export function ImportWizard() {
  const t = useTranslations("Import");

  const [parseState, parseAction, isParsing] = useActionState<ParseWorkbookState, FormData>(
    parseWorkbookAction,
    undefined
  );
  const [dismissed, setDismissed] = useState(false);

  const parsed = !dismissed && parseState && "sheets" in parseState ? parseState : null;

  if (parsed) {
    return <MappingAndReport key={parsed.token} sheets={parsed.sheets} onReset={() => setDismissed(true)} />;
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold text-neutral-700">{t("stepUpload")}</h2>
      <form
        action={(formData) => {
          setDismissed(false);
          parseAction(formData);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">{t("chooseFile")}</label>
          <input type="file" name="file" accept=".xlsx,.xls" required className="block text-sm text-neutral-700" />
        </div>
        <Button type="submit" disabled={isParsing}>
          {isParsing ? t("uploading") : t("upload")}
        </Button>
      </form>
      {parseState && "error" in parseState && (
        <p className="text-sm text-red-600">{t(PARSE_ERROR_KEYS[parseState.error] ?? "errorParseFailed")}</p>
      )}
    </Card>
  );
}

function MappingAndReport({
  sheets,
  onReset,
}: {
  sheets: ParsedSheet[];
  onReset: () => void;
}) {
  const t = useTranslations("Import");
  const tCommon = useTranslations("Common");

  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Mapping>(() => guessMapping(sheets[0]?.headers ?? []));
  const [report, setReport] = useState<ImportReport | { error: string } | null>(null);
  const [isImporting, startImporting] = useTransition();

  const activeSheet = sheets[sheetIndex];

  function selectSheet(index: number) {
    setSheetIndex(index);
    setMapping(guessMapping(sheets[index]?.headers ?? []));
  }

  const previewRows = useMemo(() => {
    if (!activeSheet) return [];
    return buildRows(activeSheet, mapping).slice(0, 5);
  }, [activeSheet, mapping]);

  function handleConfirm() {
    if (!activeSheet) return;
    const rows = buildRows(activeSheet, mapping);
    startImporting(async () => {
      const result = await importProductsAction(rows);
      setReport(result);
    });
  }

  if (report) {
    if ("error" in report) {
      return (
        <Card className="space-y-4">
          <p className="text-sm text-red-600">{t(IMPORT_ERROR_KEYS[report.error] ?? "errorParseFailed")}</p>
          <Button type="button" variant="secondary" onClick={onReset}>
            {t("startOver")}
          </Button>
        </Card>
      );
    }

    return (
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">{t("stepReport")}</h2>
        <div className="flex gap-3">
          <Badge variant="success">{t("resultImported", { count: report.imported })}</Badge>
          {report.skipped.length > 0 && (
            <Badge variant="warning">{t("resultSkipped", { count: report.skipped.length })}</Badge>
          )}
        </div>

        {report.skipped.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">{t("skippedTableTitle")}</h3>
            <Table>
              <Thead>
                <Tr>
                  <Th>{t("row")}</Th>
                  <Th>{t("fieldName")}</Th>
                  <Th>{tCommon("error")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.skipped.map((skip, i) => (
                  <Tr key={i}>
                    <Td>{skip.rowNumber}</Td>
                    <Td>{skip.name || "—"}</Td>
                    <Td>{t(REASON_KEYS[skip.reason])}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        <Button type="button" variant="secondary" onClick={onReset}>
          {t("startOver")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <h2 className="text-sm font-semibold text-neutral-700">{t("stepMap")}</h2>

      <div className="max-w-xs">
        <label className="mb-1 block text-xs font-medium text-neutral-600">{t("selectSheet")}</label>
        <Select value={sheetIndex} onChange={(e) => selectSheet(Number(e.target.value))}>
          {sheets.map((sheet, i) => (
            <option key={sheet.name} value={i}>
              {sheet.name}
            </option>
          ))}
        </Select>
        {activeSheet && (
          <p className="mt-1 text-xs text-neutral-500">{t("rowsFound", { count: activeSheet.rows.length })}</p>
        )}
        {activeSheet?.truncated && (
          <p className="mt-1 text-xs text-amber-600">{t("truncatedWarning", { max: 2000 })}</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold text-neutral-600">{t("mappingTitle")}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TARGET_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                {t(field.labelKey)}
                {field.required && " *"}
              </label>
              <Select
                value={mapping[field.key]}
                onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
              >
                <option value="">{t("noColumn")}</option>
                {activeSheet?.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-neutral-600">{t("previewTitle")}</h3>
          <Table>
            <Thead>
              <Tr>
                {TARGET_FIELDS.map((field) => (
                  <Th key={field.key}>{t(field.labelKey)}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {previewRows.map((row, i) => (
                <Tr key={i}>
                  {TARGET_FIELDS.map((field) => (
                    <Td key={field.key}>{row[field.key] ?? "—"}</Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" disabled={!mapping.name || isImporting} onClick={handleConfirm}>
          {isImporting ? t("importing") : t("confirmImport", { count: activeSheet?.rows.length ?? 0 })}
        </Button>
        <Button type="button" variant="secondary" onClick={onReset}>
          {t("startOver")}
        </Button>
      </div>
    </Card>
  );
}
