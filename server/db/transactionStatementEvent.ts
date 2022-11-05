import { Column, Entity, PrimaryColumn } from "typeorm";
import {
  TransactionStatementEvent,
  TransactionStatementType,
} from "../model/transactionStatementEvent";
import dayjs from "dayjs";

@Entity()
export class TransactionStatementEventTable {
  @PrimaryColumn({
    length: 200,
  })
  uniqueKey: string;

  @Column()
  title: string;

  @Column()
  dividedCount: number;

  @Column()
  dividedIndex: number;

  @Column()
  type: string;

  @Column()
  amount: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  transactionDate: string;

  @Column()
  createdAt: number;

  static fromTransactionStatementEvent(
    model: TransactionStatementEvent
  ): TransactionStatementEventTable {
    const record = new TransactionStatementEventTable();
    record.uniqueKey = model.uniqueKey;
    record.title = model.title;
    record.dividedCount = model.dividedCount;
    record.dividedIndex = model.dividedIndex;
    record.type = model.type;
    record.amount = model.amount;
    record.description = model.description;
    record.transactionDate = model.transactionDate;
    record.createdAt = model.createdAt;

    return record;
  }

  toTransactionStatementEvent(): TransactionStatementEvent {
    return {
      uniqueKey: this.uniqueKey,
      title: this.title,
      dividedCount: this.dividedCount,
      dividedIndex: this.dividedIndex,
      type: this.type as TransactionStatementType,
      amount: this.amount,
      description: this.description,
      createdAt: this.createdAt,
      transactionDate: this.transactionDate,
    };
  }
}