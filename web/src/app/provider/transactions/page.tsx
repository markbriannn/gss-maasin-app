"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProviderLayout from "@/components/layouts/ProviderLayout";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

interface Transaction {
  id: string;
  type: "earning" | "payout" | "refund" | "fee";
  amount: number;
  description: string;
  status: "completed" | "pending" | "failed";
  createdAt: Date;
  bookingId?: string;
  payoutMethod?: string;
}

export default function TransactionHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "earning" | "payout">("all");

  useEffect(() => {
    if (user?.uid) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(
        transactionsRef,
        where("userId", "==", user!.uid),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const transactionsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Transaction[];

      setTransactions(transactionsList);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "earning":
        return "💰";
      case "payout":
        return "📤";
      case "refund":
        return "↩️";
      case "fee":
        return "📋";
      default:
        return "💵";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Transaction History</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "earning", "payout"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-lg capitalize ${
                filter === f
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : f + "s"}
            </button>
          ))}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 mt-2">
              {filter === "all"
                ? "Your transaction history will appear here"
                : `No ${filter}s yet`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getTypeIcon(transaction.type)}</span>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                    {transaction.bookingId && (
                      <p className="text-xs text-gray-400">Booking: {transaction.bookingId.slice(0, 8)}...</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      transaction.type === "earning"
                        ? "text-green-600"
                        : transaction.type === "payout"
                        ? "text-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    {transaction.type === "earning" ? "+" : "-"}₱
                    {transaction.amount.toLocaleString()}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      transaction.status
                    )}`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
