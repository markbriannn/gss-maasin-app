"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProviderLayout from "@/components/layouts/ProviderLayout";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface PaymentMethod {
  id: string;
  type: "gcash" | "maya" | "bank";
  name: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export default function ProviderPaymentMethodsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethod, setNewMethod] = useState({
    type: "gcash" as "gcash" | "maya" | "bank",
    name: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    if (user?.uid) {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user!.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPaymentMethods(data.payoutMethods || []);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!newMethod.name || !newMethod.accountNumber || !newMethod.accountName) return;

    const method: PaymentMethod = {
      id: Date.now().toString(),
      type: newMethod.type,
      name: newMethod.name,
      accountNumber: newMethod.accountNumber,
      accountName: newMethod.accountName,
      isDefault: paymentMethods.length === 0,
    };

    const updatedMethods = [...paymentMethods, method];

    try {
      await updateDoc(doc(db, "users", user!.uid), {
        payoutMethods: updatedMethods,
      });
      setPaymentMethods(updatedMethods);
      setShowAddModal(false);
      setNewMethod({ type: "gcash", name: "", accountNumber: "", accountName: "" });
    } catch (error) {
      console.error("Error adding payment method:", error);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    const updatedMethods = paymentMethods.map((m) => ({
      ...m,
      isDefault: m.id === methodId,
    }));

    try {
      await updateDoc(doc(db, "users", user!.uid), {
        payoutMethods: updatedMethods,
      });
      setPaymentMethods(updatedMethods);
    } catch (error) {
      console.error("Error setting default:", error);
    }
  };

  const handleDelete = async (methodId: string) => {
    const updatedMethods = paymentMethods.filter((m) => m.id !== methodId);

    try {
      await updateDoc(doc(db, "users", user!.uid), {
        payoutMethods: updatedMethods,
      });
      setPaymentMethods(updatedMethods);
    } catch (error) {
      console.error("Error deleting payment method:", error);
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "gcash":
        return "💚";
      case "maya":
        return "💜";
      case "bank":
        return "🏦";
      default:
        return "💰";
    }
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
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-800">
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Payout Methods</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            + Add Method
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Add your preferred payout methods to receive earnings from completed jobs.
        </p>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No payout methods added</p>
            <p className="text-gray-400 mt-2">Add a payout method to receive your earnings</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="bg-white border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getMethodIcon(method.type)}</span>
                  <div>
                    <p className="font-medium">{method.name}</p>
                    <p className="text-sm text-gray-500">{method.accountName}</p>
                    <p className="text-sm text-gray-400">
                      ****{method.accountNumber.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault ? (
                    <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      className="text-blue-500 hover:text-blue-600 text-sm"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="text-red-500 hover:text-red-600 text-sm ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Method Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Payout Method</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={newMethod.type}
                    onChange={(e) =>
                      setNewMethod({ ...newMethod, type: e.target.value as PaymentMethod["type"] })
                    }
                    className="w-full border rounded-lg p-3"
                  >
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Label</label>
                  <input
                    type="text"
                    value={newMethod.name}
                    onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                    placeholder="e.g., My GCash"
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Account Name</label>
                  <input
                    type="text"
                    value={newMethod.accountName}
                    onChange={(e) => setNewMethod({ ...newMethod, accountName: e.target.value })}
                    placeholder="Enter account holder name"
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {newMethod.type === "bank" ? "Account Number" : "Mobile Number"}
                  </label>
                  <input
                    type="text"
                    value={newMethod.accountNumber}
                    onChange={(e) => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                    placeholder={newMethod.type === "bank" ? "Enter account number" : "09XX XXX XXXX"}
                    className="w-full border rounded-lg p-3"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMethod}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
