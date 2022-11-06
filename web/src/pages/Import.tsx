import { css } from "@emotion/react";
import dayjs from "dayjs";
import Encoding from "encoding-japanese";
import Papa from "papaparse";
import { useRef, useState } from "react";
import { Table } from "../components/Table";
import { getAuthToken } from "../helper/auth";
import { SHA256 } from "../helper/sha256";

export interface ImportedTransaction {
  schema: string;
  title: string;
  dividedCount: number;
  dividedIndex: number;
  type: string;
  amount: number;
  description: string;
  transactionDate: string;
}

const guessRecordFromHeader = (
  header: string[],
  row: Record<string, string>
): ImportedTransaction | undefined => {
  if (
    JSON.stringify(header) ===
    JSON.stringify([
      "確定情報",
      "お支払日",
      "ご利用店名（海外ご利用店名／海外都市名）",
      "ご利用日",
      "支払回数",
      "何回目",
      "ご利用金額（円）",
      "現地通貨額・通貨名称・換算レート",
    ])
  ) {
    const schema = "MUFG_CREDIT_CARD";
    const amount = Number(row["ご利用金額（円）"]?.replaceAll(",", ""));
    if (!row["ご利用金額（円）"]) {
      return undefined;
    }

    return {
      schema,
      title: row["ご利用店名（海外ご利用店名／海外都市名）"],
      dividedCount: Number(row["支払い回数"]) || 1,
      dividedIndex: Number(row["何回目"]) || 1,
      type: amount > 0 ? "income" : "expense",
      amount: Math.abs(amount),
      description: row["ご利用店名（海外ご利用店名／海外都市名）"],
      transactionDate: dayjs(
        row["ご利用日"].replace("年", "-").replace("月", "-").replace("日", "")
      ).format("YYYY-MM-DD"),
    };
  }
  if (
    JSON.stringify(header) ===
    JSON.stringify([
      "日付",
      "摘要",
      "摘要内容",
      "支払い金額",
      "預かり金額",
      "差引残高",
      "メモ",
      "未資金化区分",
      "入払区分",
    ])
  ) {
    const schema = "MUFG";
    const amount = Number(
      row["支払い金額"]?.replaceAll(",", "") ||
        row["預かり金額"]?.replaceAll(",", "")
    );
    if (isNaN(amount)) {
      return undefined;
    }

    return {
      schema,
      title: row["摘要"] ?? "不明",
      dividedCount: 1,
      dividedIndex: 1,
      type: row["支払い金額"] ? "expense" : "income",
      amount,
      description: row["摘要内容"] ?? "",
      transactionDate: dayjs(row["日付"]).format("YYYY-MM-DD"),
    };
  }

  return undefined;
};

const addUniqueKeys = (rows: ImportedTransaction[]) => {
  const dateKey: { [key: string]: Set<string> } = {};
  const result = rows.map((row) => {
    if (!dateKey[row.transactionDate]) {
      dateKey[row.transactionDate] = new Set();
    }

    const uniqueKeyCandidate = SHA256(JSON.stringify(row));
    if (!dateKey[row.transactionDate].has(uniqueKeyCandidate)) {
      dateKey[row.transactionDate].add(uniqueKeyCandidate);
      console.log(row.transactionDate, uniqueKeyCandidate, row);

      return {
        ...row,
        uniqueKey: uniqueKeyCandidate,
      };
    }

    const key = SHA256(
      `${JSON.stringify(row)}#${dateKey[row.transactionDate].size}`
    );
    if (!dateKey[row.transactionDate].has(key)) {
      dateKey[row.transactionDate].add(key);
      console.log(row.transactionDate, key, row);

      return {
        ...row,
        uniqueKey: key,
      };
    } else {
      console.log(
        `${JSON.stringify(row)}#${dateKey[row.transactionDate].size}`,
        key
      );
      throw new Error("Unique key collision");
    }
  });

  return result;
};

export const ImportPage = () => {
  const ref = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Record<string, string>[]>([]);
  const header = Object.keys(data[0] ?? {});

  return (
    <>
      <button
        onClick={() => {
          ref.current?.click();
        }}
      >
        アップロード
      </button>
      <input
        type="file"
        accept="text/csv"
        css={css`
          display: none;
        `}
        ref={ref}
        onChange={async (event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          const file = files?.[0];
          if (!file) {
            return;
          }

          const content = Encoding.convert(
            new Uint8Array(await file.arrayBuffer()),
            {
              to: "UNICODE",
              type: "string",
            }
          );

          const result = Papa.parse<Record<string, string>>(content, {
            header: true,
          });

          setData((prev) => [...prev, ...result.data]);
        }}
      />

      <Table header={header} data={data} />

      <button
        disabled={data.length === 0}
        onClick={async () => {
          const records = data
            .map((row) => guessRecordFromHeader(header, row))
            .filter((t): t is ImportedTransaction => Boolean(t));
          const input = addUniqueKeys(records);
          console.log(input);

          const resp = await fetch("/api/transactionStatementEvents", {
            method: "POST",
            body: JSON.stringify(input),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await getAuthToken()}`,
            },
          });
          console.log(await resp.text());

          if (resp.ok) {
            setData([]);
          }
        }}
      >
        上記内容で登録
      </button>
    </>
  );
};