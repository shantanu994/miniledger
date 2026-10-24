import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, FlatList, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api" });
const tokenStorage = Platform.OS === "web"
  ? {
      get: () => AsyncStorage.getItem("token"),
      set: (token: string) => AsyncStorage.setItem("token", token),
      remove: () => AsyncStorage.removeItem("token")
    }
  : {
      get: () => SecureStore.getItemAsync("token"),
      set: (token: string) => SecureStore.setItemAsync("token", token),
      remove: () => SecureStore.deleteItemAsync("token")
    };
type Loan = { id: string; friendName: string; amount: string; dueDate: string; status: string; overdue: boolean };
type Summary = { totalLent: string; totalRepaid: string; pendingAmount: string; overdueAmount: string; totalEntries: number };

function toApiDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  const normalized = match ? `${match[3]}-${match[2]}-${match[1]}` : value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === normalized ? normalized : null;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState(""); const [otp, setOtp] = useState(""); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function send() { setBusy(true); setError(""); try { await api.post("/auth/send-otp", { phone }); setSent(true); } catch (e: any) { setError(e.response?.data?.error || "Could not send OTP"); } finally { setBusy(false); } }
  async function verify() { setBusy(true); setError(""); try { const response = await api.post("/auth/verify-otp", { phone, otp }); await tokenStorage.set(response.data.token); onLogin(response.data.token); } catch (e: any) { setError(e.response?.data?.error || "Could not verify OTP"); } finally { setBusy(false); } }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginShell}>
        <Text style={styles.logoMark}>₹</Text>
        <Text style={styles.brand}>MiniLedger</Text>
        <Text style={styles.subtitle}>A simpler way to keep track of money lent to friends.</Text>
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardHint}>Sign in with your phone number to continue.</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit phone number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={send} disabled={busy}>
            <Text style={styles.primaryButtonText}>Send OTP</Text>
          </Pressable>
          {sent ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
              />
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={verify} disabled={busy}>
                <Text style={styles.primaryButtonText}>Verify OTP</Text>
              </Pressable>
            </>
          ) : null}
          {busy ? <ActivityIndicator color="#2563eb" style={styles.loader} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Dashboard({ token, logout }: { token: string; logout: () => void }) {
  const [loans, setLoans] = useState<Loan[]>([]); const [summary, setSummary] = useState<Summary | null>(null); const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [dueDate, setDueDate] = useState(""); const [error, setError] = useState("");
  const client = axios.create({ baseURL: api.defaults.baseURL, headers: { Authorization: `Bearer ${token}` } });
  async function refresh() { try { const [list, totals] = await Promise.all([client.get("/loans"), client.get("/loans/summary")]); setLoans(list.data.loans); setSummary(totals.data); } catch (e: any) { if (e.response?.status === 401) logout(); else setError("Could not load your loans"); } }
  useEffect(() => { refresh(); }, []);
  async function addLoan() {
    const apiDate = toApiDate(dueDate);
    if (!apiDate) {
      setError("Enter a valid due date as DD-MM-YYYY or YYYY-MM-DD");
      return;
    }
    try {
      await client.post("/loans", { friendName: name, amount: Number(amount), dueDate: apiDate });
      setName(""); setAmount(""); setDueDate(""); await refresh();
    } catch (e: any) {
      setError(e.response?.data?.error || "Could not create loan");
    }
  }
  async function repay(id: string) { try { await client.patch(`/loans/${id}/repay`); await refresh(); } catch (e: any) { setError(e.response?.data?.error || "Could not repay loan"); } }
  async function uploadReceipt(id: string) { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 }); if (result.canceled) return; const asset = result.assets[0]; const form = new FormData(); form.append("receipt", { uri: asset.uri, name: "receipt.jpg", type: "image/jpeg" } as any); try { await client.post(`/loans/${id}/receipt`, form, { headers: { "Content-Type": "multipart/form-data" } }); Alert.alert("Receipt uploaded"); } catch (e: any) { setError(e.response?.data?.error || "Could not upload receipt"); } }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.dashboard}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR MONEY, ORGANIZED</Text>
            <Text style={styles.title}>Your ledger</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
        <Text style={styles.greeting}>Keep an eye on every rupee you lend.</Text>
        {summary ? (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.blueCard]}><Text style={styles.summaryLabel}>TOTAL LENT</Text><Text style={styles.summaryValue}>₹{summary.totalLent}</Text><Text style={styles.summaryCaption}>All entries</Text></View>
            <View style={[styles.summaryCard, styles.greenCard]}><Text style={styles.summaryLabel}>REPAID</Text><Text style={styles.summaryValue}>₹{summary.totalRepaid}</Text><Text style={styles.summaryCaption}>Money returned</Text></View>
            <View style={[styles.summaryCard, styles.amberCard]}><Text style={styles.summaryLabel}>PENDING</Text><Text style={styles.summaryValue}>₹{summary.pendingAmount}</Text><Text style={styles.summaryCaption}>Awaiting repayment</Text></View>
            <View style={[styles.summaryCard, styles.redCard]}><Text style={styles.summaryLabel}>OVERDUE</Text><Text style={styles.summaryValue}>₹{summary.overdueAmount}</Text><Text style={styles.summaryCaption}>Needs attention</Text></View>
          </View>
        ) : null}
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}><View><Text style={styles.section}>Add a loan</Text><Text style={styles.sectionHint}>Record money you have lent to a friend.</Text></View><Text style={styles.plus}>+</Text></View>
          <TextInput style={styles.input} placeholder="Friend's name" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Amount" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <TextInput style={styles.input} placeholder="Due date (DD-MM-YYYY)" placeholderTextColor="#94a3b8" value={dueDate} onChangeText={setDueDate} />
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]} onPress={addLoan}>
            <Text style={styles.primaryButtonText}>Add loan</Text>
          </Pressable>
        </View>
        <View style={styles.loansHeader}><View><Text style={styles.section}>Your loans</Text><Text style={styles.sectionHint}>{loans.length} {loans.length === 1 ? "entry" : "entries"} in your ledger</Text></View></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={loans}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>Add your first loan above to start tracking.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.loanCard}>
              <View style={styles.loanTop}><View><Text style={styles.loanName}>{item.friendName}</Text><Text style={styles.loanDate}>Due {item.dueDate}</Text></View><Text style={styles.loanAmount}>₹{item.amount}</Text></View>
              <View style={styles.loanBottom}>
                <Text style={[styles.statusBadge, item.status === "REPAID" ? styles.repaidBadge : item.overdue ? styles.overdueBadge : styles.pendingBadge]}>{item.status === "REPAID" ? "Repaid" : item.overdue ? "Overdue" : "Pending"}</Text>
                <View style={styles.loanActions}>{item.status === "PENDING" ? <Pressable style={styles.secondaryButton} onPress={() => repay(item.id)}><Text style={styles.secondaryButtonText}>Mark repaid</Text></Pressable> : null}<Pressable style={styles.receiptButton} onPress={() => uploadReceipt(item.id)}><Text style={styles.receiptButtonText}>Receipt</Text></Pressable></View>
              </View>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { tokenStorage.get().then(setToken); }, []);
  if (!token) return <Login onLogin={setToken} />;
  return <Dashboard token={token} logout={async () => { await tokenStorage.remove(); setToken(null); }} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  dashboard: { width: "100%", maxWidth: 1120, alignSelf: "center", padding: 28, paddingBottom: 60 },
  loginShell: { width: "100%", maxWidth: 480, alignSelf: "center", paddingTop: 70 },
  logoMark: { alignSelf: "center", backgroundColor: "#2563eb", color: "white", fontSize: 26, fontWeight: "800", textAlign: "center", paddingTop: 8, width: 52, height: 52, borderRadius: 16, overflow: "hidden" },
  brand: { fontSize: 36, fontWeight: "800", color: "#102a43", textAlign: "center", marginTop: 16 },
  subtitle: { color: "#64748b", textAlign: "center", lineHeight: 22, marginTop: 8, marginBottom: 28 },
  loginCard: { backgroundColor: "white", borderRadius: 20, padding: 26, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#1e3a8a", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cardTitle: { color: "#102a43", fontSize: 22, fontWeight: "800" },
  cardHint: { color: "#64748b", marginTop: 5, marginBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#2563eb", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 34, fontWeight: "800", color: "#102a43" },
  greeting: { color: "#64748b", fontSize: 15, marginTop: 6, marginBottom: 24 },
  logoutButton: { backgroundColor: "#e8f0ff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  logoutText: { color: "#2563eb", fontWeight: "700" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  summaryCard: { flexGrow: 1, flexBasis: 210, minHeight: 122, borderRadius: 16, padding: 18, borderWidth: 1 },
  blueCard: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  greenCard: { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0" },
  amberCard: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  redCard: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  summaryLabel: { color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  summaryValue: { color: "#102a43", fontSize: 24, fontWeight: "800", marginTop: 12 },
  summaryCaption: { color: "#64748b", fontSize: 12, marginTop: 5 },
  formCard: { backgroundColor: "white", borderRadius: 18, padding: 22, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { color: "#102a43", fontSize: 21, fontWeight: "800", marginBottom: 4 },
  sectionHint: { color: "#64748b", fontSize: 13, marginBottom: 14 },
  plus: { color: "#2563eb", backgroundColor: "#eff6ff", fontSize: 25, fontWeight: "500", textAlign: "center", width: 38, height: 38, borderRadius: 12 },
  input: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 11, padding: 13, marginVertical: 5, color: "#102a43", fontSize: 15 },
  primaryButton: { backgroundColor: "#2563eb", borderRadius: 11, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  primaryButtonText: { color: "white", fontWeight: "800", fontSize: 15 },
  buttonPressed: { opacity: 0.8 },
  loader: { marginTop: 14 },
  loansHeader: { marginBottom: 6 },
  loanCard: { backgroundColor: "white", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12 },
  loanTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  loanName: { color: "#102a43", fontSize: 18, fontWeight: "800" },
  loanDate: { color: "#64748b", fontSize: 13, marginTop: 5 },
  loanAmount: { color: "#102a43", fontSize: 20, fontWeight: "800" },
  loanBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 12, fontWeight: "800" },
  repaidBadge: { color: "#047857", backgroundColor: "#d1fae5" },
  overdueBadge: { color: "#be123c", backgroundColor: "#ffe4e6" },
  pendingBadge: { color: "#b45309", backgroundColor: "#fef3c7" },
  loanActions: { flexDirection: "row", gap: 8 },
  secondaryButton: { borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  secondaryButtonText: { color: "#2563eb", fontSize: 12, fontWeight: "700" },
  receiptButton: { backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  receiptButtonText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  emptyCard: { alignItems: "center", backgroundColor: "white", borderRadius: 16, padding: 32, borderWidth: 1, borderColor: "#e2e8f0" },
  emptyIcon: { color: "#2563eb", backgroundColor: "#eff6ff", borderRadius: 20, fontSize: 22, paddingHorizontal: 11, paddingVertical: 5 },
  emptyTitle: { color: "#102a43", fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptyText: { color: "#64748b", marginTop: 5 },
  error: { color: "#be123c", backgroundColor: "#fff1f2", borderRadius: 9, padding: 11, marginBottom: 12 }
});
