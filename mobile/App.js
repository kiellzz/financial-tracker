import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { StatusBar } from "expo-status-bar";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://ezsaldo-backend.onrender.com/api";
const TOKEN_KEY = "ezsaldo.mobile.token";
const CATEGORIES = ["Alimentação", "Moradia", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Receita", "Outros"];
const colors = { background: "#050b16", surface: "rgba(13,24,48,0.88)", surfaceSoft: "rgba(255,255,255,0.055)", border: "rgba(255,255,255,0.09)", text: "#f4f7fb", muted: "#aeb8cb", primary: "#35c2ff", primaryDark: "#17698f", danger: "#ff697e", income: "#36d6a1", expense: "#ff697e", warning: "#f4bd5b" };
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "Data indisponível";
const monthLabel = (value) => { if (!value) return "—"; const [year, month] = value.split("-"); return new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }); };
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "EZ";

async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação");
  return data;
}

function Logo({ compact = false }) { return <View style={[styles.logoRow, compact && styles.logoRowCompact]}><Text style={styles.logoEz}>EZ</Text><Text style={styles.logoSaldo}>Saldo</Text></View>; }
function Field({ label, ...props }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} /></View>; }
function Button({ title, onPress, secondary = false, danger = false, disabled = false, Icon }) { const iconColor = danger ? "#ffffff" : secondary ? colors.text : "#06111f"; return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, danger && styles.buttonDanger, danger && styles.buttonDangerRefined, disabled && styles.disabled, pressed && styles.pressed]}><View style={styles.buttonContent}>{Icon && <Icon color={iconColor} size={18} />}<Text style={[styles.buttonText, secondary && styles.buttonSecondaryText, danger && styles.buttonDangerText]}>{title}</Text></View></Pressable>; }
function Avatar({ profileImage, name, size = 52 }) { return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Image source={profileImage ? { uri: profileImage } : require("../frontend/assets/avatar-default.png")} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={`Foto de ${name || "perfil"}`} /></View>; }
function Empty({ title, caption }) { return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.muted}>{caption}</Text></View>; }
function AppBackground({ children }) { return <ImageBackground source={require("../frontend/assets/background-ds.jpg")} resizeMode="cover" style={styles.backgroundImage} imageStyle={styles.backgroundImageAsset}><View style={styles.backgroundOverlay}>{children}</View></ImageBackground>; }
function PageHeader({ user, onOpenProfile }) { return <View style={styles.pageHeader}><Logo compact /><View style={styles.headerSpacer} />{user ? <Pressable onPress={onOpenProfile}><Avatar profileImage={user.profileImage} name={user.name} size={42} /></Pressable> : null}</View>; }
function CalendarIcon({ color = colors.primary, size = 20 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="1.8" /><Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" /><Line x1="8" y1="3" x2="8" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><Line x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><Circle cx="8" cy="15" r="1" fill={color} /><Circle cx="12" cy="15" r="1" fill={color} /></Svg>; }
function DollarIcon({ color = colors.muted, size = 22 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M16.5 6.8c-1.1-1.2-2.6-1.8-4.5-1.8-2.6 0-4.5 1.2-4.5 3.2 0 4.6 9 2 9 6.7 0 2-1.9 3.4-4.5 3.4-1.9 0-3.6-.7-4.8-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><Line x1="12" y1="2.5" x2="12" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></Svg>; }
function UserIcon({ color = colors.muted, size = 22 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" /><Path d="M5 20v-1.2C5 15.6 7.7 14 12 14s7 1.6 7 4.8V20H5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></Svg>; }
function SaveIcon({ color, size = 18 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 3h13l3 3v15H4V3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /><Path d="M7 3v6h9V3M8 21v-8h8v8" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></Svg>; }
function LockIcon({ color, size = 18 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="5" y="10" width="14" height="11" rx="2" stroke={color} strokeWidth="1.8" /><Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><Circle cx="12" cy="15.5" r="1" fill={color} /></Svg>; }
function TrashIcon({ color, size = 18 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function PieChartIcon({ color = colors.muted, size = 22 }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" /><Path d="M12 3v9h9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><Path d="M12 12V3a9 9 0 0 1 9 9H12Z" fill={color} opacity="0.18" /></Svg>; }
function TransactionTrendIcon({ income, direction = income ? "up" : "down", color = income ? colors.income : colors.expense }) { const path = direction === "up" ? "M3 18l5-6 4 2 8-9m-5 0h5v5" : direction === "down" ? "M3 6l5 6 4-2 8 9m-5 0h5v-5" : "M3 12h17m-4-4 4 4-4 4"; return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none"><Path d={path} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
const CATEGORY_ICON_PATHS = {
  "Alimentação": "M5 3v7m3-7v7M5 7h3m-1.5 3v11M16 21V3c3 2 4 5 4 8h-4",
  "Moradia": "M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6",
  "Transporte": "M5 16 6.5 8h11L19 16M4 16h16v4h-2v-2H6v2H4v-4Zm3-4h2m6 0h2",
  "Saúde": "M12 21 4.5 13.5C1 10 4 4 8 5c2 .5 3 2 4 3 1-1 2-2.5 4-3 4-1 7 5 3.5 8.5L12 21Z",
  "Educação": "M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1V5Zm18 0c-3-1-6-1-9 1v14c3-2 6-2 9-1V5Z",
  "Lazer": "M9 6.5v11l9-5.5-9-5.5Z M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  "Assinaturas": "M20 8a8 8 0 0 0-14-2L4 8m0-4v4h4m-4 8a8 8 0 0 0 14 2l2-2m0 4v-4h-4",
  "Compras": "M4 8h16l-1 13H5L4 8Zm4 1V6a4 4 0 0 1 8 0v3",
  "Outros": "M5 12h.01M12 12h.01M19 12h.01"
};
function CategoryIcon({ category, color }) { if (category === "Receita") return <DollarIcon color={color} size={15} />; return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d={CATEGORY_ICON_PATHS[category] || CATEGORY_ICON_PATHS.Outros} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function CategoryPicker({ value, onChange }) { return <><Text style={[styles.label, styles.categoryLabel]}>Categoria</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" delaysContentTouches={false} contentContainerStyle={styles.chips}>{CATEGORIES.map((item) => <Pressable key={item} onPress={() => onChange(item)} hitSlop={4} accessibilityRole="button" accessibilityState={{ selected: value === item }} style={[styles.chip, styles.chipWithIcon, value === item && styles.chipSelected]}><CategoryIcon category={item} color={value === item ? "#f4fbff" : "#9db4d0"} /><Text style={styles.chipText}>{item}</Text></Pressable>)}</ScrollView></>; }
function TransactionTypeHint({ isExpense }) { return <View style={styles.typeHint}><Text style={styles.typeHintTitle}>Tipo de transação: <Text style={isExpense ? styles.typeHintExpense : styles.typeHintIncome}>{isExpense ? "Saída" : "Entrada"}</Text></Text><Text style={styles.typeHintHelp}>Use sinal negativo (−) para registrar uma saída.</Text></View>; }
function DateField({ label, value, onChange, minimumDate, maximumDate, placeholder = "Selecionar data" }) { const [show, setShow] = useState(false); const selected = value ? new Date(`${value}T12:00:00`) : new Date(); return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable style={styles.dateControl} onPress={() => setShow(!show)}><Text style={value ? styles.dateControlText : styles.datePlaceholder}>{value ? dateLabel(selected) : placeholder}</Text><CalendarIcon /></Pressable>{show && <DateTimePicker value={selected} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} minimumDate={minimumDate} maximumDate={maximumDate} onChange={(event, date) => { if (Platform.OS !== "ios") setShow(false); if (event.type !== "dismissed" && date) onChange(dateKey(date)); }} />}</View>; }

function AuthScreen({ onLogin }) {
  const [register, setRegister] = useState(false); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState("");
  async function submit() { setFeedback(""); if (!email || !password || (register && !name)) return setFeedback("Preencha todos os campos."); setBusy(true); try { if (register) { await request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }); setRegister(false); setFeedback("Cadastro realizado. Agora entre na sua conta."); } else { const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); await AsyncStorage.setItem(TOKEN_KEY, result.token); onLogin(result.token, result); } } catch (error) { setFeedback(error.message); } finally { setBusy(false); } }
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled"><Logo /><Text style={styles.authTitle}>{register ? "Crie sua conta" : "Bem-vindo de volta"}</Text><Text style={styles.authSubtitle}>{register ? "Organize sua vida financeira com clareza." : "Acompanhe seu saldo onde estiver."}</Text>{register && <Field label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Seu nome" />}<Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" /><Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo de 6 caracteres" />{!!feedback && <Text style={feedback.startsWith("Cadastro") ? styles.success : styles.error}>{feedback}</Text>}<Button title={busy ? "Aguarde..." : register ? "Cadastrar" : "Entrar"} onPress={submit} disabled={busy} />{busy && <ActivityIndicator color={colors.primary} style={styles.loader} />}<Pressable onPress={() => { setRegister(!register); setFeedback(""); }}><Text style={styles.switchText}>{register ? "Já tenho uma conta · Entrar" : "Ainda não tenho conta · Cadastrar"}</Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function SummaryCard({ balance, income, expense }) { return <View style={styles.summary}><Text style={styles.summaryLabel}>Saldo atual</Text><Text style={styles.balance}>{money(balance)}</Text><View style={styles.summaryRow}><View><Text style={styles.summaryLabel}>Entradas</Text><Text style={styles.income}>{money(income)}</Text></View><View><Text style={styles.summaryLabel}>Saídas</Text><Text style={styles.expense}>{money(expense)}</Text></View></View></View>; }

function PeriodResultCard({ transactions }) {
  const [range, setRange] = useState("account");
  const [subtractFirstIncome, setSubtractFirstIncome] = useState(false);
  const today = dateKey();
  const normalized = transactions.map((item) => ({ ...item, dateKey: String(item.date || "").slice(0, 10), amount: Number(item.amount) || 0 }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.dateKey))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const firstDate = normalized[0]?.dateKey || today;
  const days = range === "today" ? 1 : range === "7" ? 7 : 30;
  const shifted = new Date();
  shifted.setDate(shifted.getDate() - (days - 1));
  const shiftedKey = dateKey(shifted);
  const startKey = range === "account" ? firstDate : shiftedKey < "2026-01-01" ? "2026-01-01" : shiftedKey;
  const change = normalized.reduce((sum, item) => {
    if (item.dateKey < startKey || item.dateKey > today) return sum;
    return sum + (item.type === "expense" ? -item.amount : item.amount);
  }, 0) - (range === "account" && subtractFirstIncome ? normalized.find((item) => item.type === "income")?.amount || 0 : 0);
  const message = change > 0 ? `Seu saldo aumentou em ${money(change)}` : change < 0 ? `Seu saldo diminuiu em ${money(Math.abs(change))}` : "Seu saldo permaneceu igual";
  const tone = change > 0 ? colors.income : change < 0 ? colors.expense : colors.muted;
  const startLabel = startKey.split("-").reverse().join("/");
  return <View style={[styles.periodCard, { borderColor: change > 0 ? "rgba(54,214,161,.25)" : change < 0 ? "rgba(255,105,126,.25)" : colors.border }]}>
    <View style={styles.periodHeader}><Text style={styles.periodLabel}>RESULTADO DO PERÍODO</Text><Text style={styles.periodRange}>{startLabel} → Hoje</Text></View>
    {range === "account" && <Pressable onPress={() => setSubtractFirstIncome(!subtractFirstIncome)} style={styles.periodCheckRow} accessibilityRole="checkbox" accessibilityState={{ checked: subtractFirstIncome }}><View style={[styles.periodCheckbox, subtractFirstIncome && styles.periodCheckboxChecked]}>{subtractFirstIncome && <Text style={styles.periodCheckmark}>✓</Text>}</View><Text style={styles.periodCheckText}>Descontar primeira entrada</Text></Pressable>}
    <Text style={[styles.periodMessage, { color: tone }]}>{message}</Text>
    <View style={styles.periodFilters}>{[["today", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["account", "Desde o início"]].map(([key, label]) => <Pressable key={key} onPress={() => setRange(key)} style={[styles.periodFilter, range === key && styles.periodFilterActive]} accessibilityRole="button" accessibilityState={{ selected: range === key }}><Text style={[styles.periodFilterText, range === key && styles.periodFilterTextActive]}>{label}</Text></Pressable>)}</View>
  </View>;
}

function TransactionRow({ item, onEdit, onDelete, showType = false }) {
  const income = item.type === "income";
  return <View style={[styles.transaction, styles.transactionRefined]}>
    <View style={[styles.transactionIcon, income ? styles.incomeIconRefined : styles.expenseIconRefined]}><TransactionTrendIcon income={income} /></View>
    <View style={styles.transactionMain}>
      <Text style={styles.transactionTitle} numberOfLines={1}>{item.description?.trim() || item.category || "Transação"}</Text>
      {showType && <Text style={income ? styles.incomeSmall : styles.expenseSmall}>{income ? "Entrada" : "Saída"} · {item.category || "Outros"}</Text>}
      <Text style={styles.transactionDate} numberOfLines={1}>{showType ? "" : `${item.category || "Outros"} · `}{dateLabel(item.date)}</Text>
    </View>
    <View style={styles.transactionRight}>
      <Text style={[income ? styles.income : styles.expense, styles.transactionAmount]} numberOfLines={1}>{income ? "+" : "−"}{money(Math.abs(item.amount))}</Text>
      <View style={styles.transactionActions}>
        <Pressable onPress={() => onEdit(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Editar ${item.description || "transação"}`}><Text style={styles.editAction}>Editar</Text></Pressable>
        <Pressable onPress={() => onDelete(item._id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Excluir ${item.description || "transação"}`}><Text style={styles.deleteAction}>Excluir</Text></Pressable>
      </View>
    </View>
  </View>;
}

function EditTransactionModal({ transaction, token, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(transaction.type === "expense" ? -Math.abs(transaction.amount) : Math.abs(transaction.amount)).replace(".", ","));
  const [description, setDescription] = useState(transaction.description || "");
  const [category, setCategory] = useState(transaction.category || "Outros");
  const [transactionDate, setTransactionDate] = useState(String(transaction.date || "").slice(0, 10) || dateKey());
  const [busy, setBusy] = useState(false);
  const signedAmount = Number(String(amount).replace(",", "."));
  const detectedExpense = Number.isFinite(signedAmount) && signedAmount < 0;
  async function save() {
    if (!Number.isFinite(signedAmount) || signedAmount === 0) return Alert.alert("Valor inválido", "Informe um valor diferente de zero.");
    if (!transactionDate) return Alert.alert("Data inválida", "Selecione a data da transação.");
    setBusy(true);
    try {
      await request(`/transactions/${transaction._id}`, { method: "PUT", body: JSON.stringify({ type: detectedExpense ? "expense" : "income", amount: Math.abs(signedAmount), description: description.trim(), category, date: transactionDate }) }, token);
      await onSaved();
      setBusy(false);
      onClose();
    } catch (error) { setBusy(false); Alert.alert("Não foi possível atualizar", error.message); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.editModalCard}>
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.editModalContent}>
          <Text style={styles.sectionTitle}>Editar transação</Text>
          <Text style={styles.panelCaption}>Atualize os dados e salve as alterações.</Text>
          <TransactionTypeHint isExpense={detectedExpense} />
          <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="default" placeholder="Ex.: -150,00 ou 150,00" />
          <DateField label="Data" value={transactionDate} onChange={setTransactionDate} minimumDate={new Date("2026-01-01T12:00:00")} maximumDate={new Date()} />
          <Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Mercado" />
          <CategoryPicker value={category} onChange={setCategory} />
          <Button title={busy ? "Salvando..." : "Salvar alterações"} onPress={save} disabled={busy} />
          <Button title="Cancelar" onPress={onClose} secondary disabled={busy} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

function NewTransactionForm({ token, onSaved }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [transactionDate, setTransactionDate] = useState(dateKey());
  const [busy, setBusy] = useState(false);
  const signedAmount = Number(String(amount).replace(",", "."));
  const detectedExpense = Number.isFinite(signedAmount) && signedAmount < 0;
  async function addTransaction() {
    if (!Number.isFinite(signedAmount) || signedAmount === 0) return Alert.alert("Valor inválido", "Informe um valor diferente de zero.");
    setBusy(true);
    try {
      await request("/transactions", { method: "POST", body: JSON.stringify({ type: detectedExpense ? "expense" : "income", amount: Math.abs(signedAmount), description, category, date: transactionDate }) }, token);
      setBusy(false);
      onSaved();
    } catch (error) { setBusy(false); Alert.alert("Não foi possível salvar", error.message); }
  }
  return <View style={styles.formCard}>
    <Text style={styles.sectionTitle}>Nova transação</Text>
    <TransactionTypeHint isExpense={detectedExpense} />
    <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="default" placeholder="Ex.: -150,00 ou 150,00" />
    <DateField label="Data" value={transactionDate} onChange={setTransactionDate} minimumDate={new Date("2026-01-01T12:00:00")} maximumDate={new Date()} />
    <Field label="Descrição" value={description} onChangeText={setDescription} placeholder="Ex.: Mercado" />
    <CategoryPicker value={category} onChange={setCategory} />
    <Button title={busy ? "Salvando..." : "Salvar transação"} onPress={addTransaction} disabled={busy} />
  </View>;
}

function Dashboard({ token, user, onOpenProfile }) {
  const [transactions, setTransactions] = useState([]); const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 }); const [refreshing, setRefreshing] = useState(false); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState(null);
  async function load() { try { const data = await request("/transactions", {}, token); setTransactions(data.transactions || []); setTotals({ balance: data.balance, income: data.income, expense: data.expense }); } catch (error) { Alert.alert("Erro", error.message); } }
  useEffect(() => { load(); }, []);
  function removeTransaction(id) { Alert.alert("Excluir transação?", "Essa ação não pode ser desfeita.", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => { try { await request(`/transactions/${id}`, { method: "DELETE" }, token); load(); } catch (error) { Alert.alert("Erro", error.message); } } }]); }
  return <ScrollView style={styles.flex} contentContainerStyle={styles.dashboard} keyboardShouldPersistTaps="always" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <PageHeader user={user} onOpenProfile={onOpenProfile} />
    <View style={styles.topbar}><View><Text style={styles.hello}>Olá, {(user?.name || "Olá").split(" ")[0]} 👋</Text><Text style={styles.muted}>Sua vida financeira, em um só lugar.</Text></View></View>
    <SummaryCard {...totals} />
    <PeriodResultCard transactions={transactions} />
    <Button title={showForm ? "Fechar formulário" : "+ Nova transação"} onPress={() => setShowForm(!showForm)} />
    {showForm && <NewTransactionForm token={token} onSaved={() => { setShowForm(false); load(); }} />}
    <View style={styles.listHeader}><Text style={styles.sectionTitle}>Últimas transações</Text><Text style={styles.muted}>{transactions.length} lançamento(s)</Text></View>
    {transactions.length ? transactions.map((item) => <TransactionRow key={item._id} item={item} onEdit={setEditing} onDelete={removeTransaction} />) : <Empty title="Nenhuma transação ainda" caption="Adicione sua primeira entrada ou saída." />}
    {editing && <EditTransactionModal key={editing._id} transaction={editing} token={token} onClose={() => setEditing(null)} onSaved={load} />}
  </ScrollView>;
}

function TransactionsScreen({ token, user, onOpenProfile }) {
  const emptyFilters = { dateFrom: "", dateTo: "", type: "all", min: "", max: "" };
  const [transactions, setTransactions] = useState([]); const [filters, setFilters] = useState(emptyFilters); const [applied, setApplied] = useState(emptyFilters); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(""); const [editing, setEditing] = useState(null);
  async function load() { setError(""); try { const data = await request("/transactions", {}, token); setTransactions(data.transactions || []); } catch (reason) { setError(reason.message); } }
  useEffect(() => { load(); }, []);
  function removeTransaction(id) { Alert.alert("Excluir transação?", "Essa ação não pode ser desfeita.", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => { try { await request(`/transactions/${id}`, { method: "DELETE" }, token); await load(); } catch (error) { Alert.alert("Erro", error.message); } } }]); }
  function applyFilters() { if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) return Alert.alert("Datas inválidas", "A data inicial não pode ser posterior à data final."); const min = filters.min === "" ? null : Number(filters.min.replace(",", ".")); const max = filters.max === "" ? null : Number(filters.max.replace(",", ".")); if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) return Alert.alert("Valor inválido", "Confira os valores mínimo e máximo."); if (min !== null && max !== null && min > max) return Alert.alert("Valores inválidos", "O valor mínimo não pode ser maior que o máximo."); setApplied({ ...filters }); }
  const filtered = transactions.filter((item) => { const date = String(item.date || "").slice(0, 10); const amount = item.type === "expense" ? -Math.abs(Number(item.amount) || 0) : Math.abs(Number(item.amount) || 0); const min = applied.min === "" ? null : Number(applied.min.replace(",", ".")); const max = applied.max === "" ? null : Number(applied.max.replace(",", ".")); if (applied.dateFrom && date < applied.dateFrom) return false; if (applied.dateTo && date > applied.dateTo) return false; if (applied.type !== "all" && item.type !== applied.type) return false; if (min !== null && amount < min) return false; if (max !== null && amount > max) return false; return true; });
  const isFiltered = Object.values(applied).some((value) => value && value !== "all");
  return <ScrollView style={styles.flex} contentContainerStyle={styles.dashboard} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <PageHeader user={user} onOpenProfile={onOpenProfile} />
    <View style={styles.pageTitleRow}><View style={styles.pageTitleContent}><Text style={styles.eyebrow}>HISTÓRICO FINANCEIRO</Text><Text style={styles.analyticsTitle}>Todas as transações</Text><Text style={styles.muted}>Consulte entradas e saídas usando os filtros abaixo.</Text></View><View style={styles.resultsPill}><Text style={styles.resultsPillText}>{filtered.length}</Text></View></View>
    <View style={styles.analyticsPanel}>
      <Text style={styles.sectionTitle}>Filtros</Text><Text style={styles.panelCaption}>As datas inicial e final são inclusivas.</Text>
      <DateField label="Data inicial" value={filters.dateFrom} onChange={(value) => setFilters({ ...filters, dateFrom: value })} minimumDate={new Date("2026-01-01T12:00:00")} maximumDate={new Date()} placeholder="Sem data inicial" />
      <DateField label="Data final" value={filters.dateTo} onChange={(value) => setFilters({ ...filters, dateTo: value })} minimumDate={new Date("2026-01-01T12:00:00")} maximumDate={new Date()} placeholder="Sem data final" />
      <Text style={[styles.label, styles.filterTypeLabel]}>Tipo</Text>
      <View style={styles.filterTypes}>{[["all", "Todos"], ["income", "Entradas"], ["expense", "Saídas"]].map(([value, label]) => {
        const active = filters.type === value;
        return <Pressable key={value} onPress={() => setFilters({ ...filters, type: value })} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.filterType, active && (value === "income" ? styles.filterTypeIncomeActive : value === "expense" ? styles.filterTypeExpenseActive : styles.filterTypeActive)]}><Text style={[styles.filterTypeText, active && (value === "all" ? styles.filterTypeTextActive : styles.filterTypeTextWhite)]}>{label}</Text></Pressable>;
      })}</View>
      <View style={styles.filterValues}><View style={styles.filterHalf}><Field label="Valor mínimo" value={filters.min} onChangeText={(value) => setFilters({ ...filters, min: value })} placeholder="Ex.: -100,00" keyboardType="decimal-pad" /></View><View style={styles.filterHalf}><Field label="Valor máximo" value={filters.max} onChangeText={(value) => setFilters({ ...filters, max: value })} placeholder="Sem limite" keyboardType="decimal-pad" /></View></View>
      <Text style={styles.filterHint}>Use valores negativos para filtrar saídas, por exemplo: mínimo −100,00.</Text>
      <View style={styles.filterButtons}><View style={styles.filterButton}><Button title="Limpar" secondary onPress={() => { setFilters(emptyFilters); setApplied(emptyFilters); }} /></View><View style={styles.filterButton}><Button title="Aplicar filtros" onPress={applyFilters} /></View></View>
    </View>
    <View style={styles.resultsHeading}><View><Text style={styles.sectionTitle}>Transações</Text><Text style={styles.panelCaption}>{isFiltered ? "Resultado dos filtros, da mais recente para a mais antiga." : "Ordenadas da mais recente para a mais antiga."}</Text></View></View>
    {error ? <Empty title="Não foi possível carregar" caption={error} /> : filtered.length ? filtered.map((item) => <TransactionRow key={item._id} item={item} showType onEdit={setEditing} onDelete={removeTransaction} />) : <Empty title="Nenhuma transação encontrada" caption={isFiltered ? "Nenhuma transação corresponde aos filtros selecionados." : "Você ainda não possui transações cadastradas."} />}
    {editing && <EditTransactionModal key={editing._id} transaction={editing} token={token} onClose={() => setEditing(null)} onSaved={load} />}
  </ScrollView>;
}

function ComparisonTrendRow({ item }) {
  const direction = item.trend === "up" || item.trend === "new_category" ? "up" : item.trend === "down" ? "down" : "flat";
  const color = direction === "up" ? colors.expense : direction === "down" ? colors.income : colors.muted;
  return <View style={styles.comparison}>
    <View style={[styles.trendIcon, direction === "up" ? styles.expenseIconRefined : direction === "down" ? styles.incomeIconRefined : styles.trendIconNeutral]}><TransactionTrendIcon direction={direction} color={color} /></View>
    <View style={styles.comparisonText}><Text style={styles.transactionTitle}>{item.category}</Text><Text style={styles.muted}>{item.message}</Text></View>
  </View>;
}

function OutlierRow({ item }) {
  return <View style={[styles.outlier, styles.outlierRefined]}>
    <View style={[styles.trendIcon, styles.expenseIconRefined]}><TransactionTrendIcon income={false} /></View>
    <View style={styles.outlierMain}><Text style={styles.transactionTitle}>{item.description || "Gasto sem descrição"}</Text><Text style={styles.muted}>{item.category} · {dateLabel(item.date)}</Text></View>
    <Text style={styles.expense}>{money(item.amount)}</Text>
  </View>;
}

function AnalyticsScreen({ token, user, onOpenProfile }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load() { setLoading(true); setError(""); try { setData(await request("/analytics/summary", {}, token)); } catch (reason) { setError(reason.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const maxMonthly = Math.max(...(data?.monthly_evolution || []).flatMap((item) => [Math.abs(item.income), Math.abs(item.expense)]), 1);
  if (loading) return <View style={styles.loaderScreen}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.muted}>Preparando sua análise financeira...</Text></View>;
  if (error) return <View style={styles.screenPadding}><Empty title="Análise indisponível" caption={error} /><Button title="Tentar novamente" onPress={load} /></View>;
  const evolution = data?.monthly_evolution || [];
  const barWidth = (value, maximum) => `${Math.min(100, Math.max(0, Math.abs(value) / maximum * 100))}%`;
  return <ScrollView style={styles.flex} contentContainerStyle={styles.dashboard} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}><PageHeader user={user} onOpenProfile={onOpenProfile} /><View style={styles.analyticsHero}><Text style={styles.eyebrow}>ANÁLISE FINANCEIRA</Text><Text style={styles.analyticsTitle}>Visão de {monthLabel(data?.reference_month)}</Text><Text style={styles.muted}>Dados calculados a partir das suas transações.</Text></View><View style={styles.projectionCard}><Text style={styles.projectionLabel}>Saldo estimado para o próximo mês</Text><Text style={[styles.projectionValue, (data?.projection?.value || 0) < 0 && styles.expense]}>{data?.projection?.value == null ? "Indisponível" : money(data.projection.value)}</Text><Text style={styles.muted}>Média móvel dos últimos 3 meses completos.</Text>{data?.projection?.warning && <Text style={styles.warningText}>{data.projection.warning}</Text>}</View><View style={styles.analyticsPanel}><Text style={styles.sectionTitle}>Gastos por categoria</Text><Text style={styles.panelCaption}>Distribuição das saídas no mês atual</Text>{data?.category_spending?.length ? data.category_spending.map((item) => <View key={item.category} style={styles.metricRow}><View style={styles.metricHeader}><Text style={styles.metricLabel}>{item.category}</Text><Text style={styles.metricValue}>{money(item.amount)} · {item.percentage_of_expenses.toFixed(0)}%</Text></View><View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, item.percentage_of_expenses))}%` }]} /></View></View>) : <Text style={styles.muted}>Nenhuma saída encontrada neste mês.</Text>}</View><View style={styles.analyticsPanel}><Text style={styles.sectionTitle}>Evolução mensal</Text><Text style={styles.panelCaption}>Receitas e despesas por mês · escala comum entre os meses</Text>{evolution.length ? evolution.map((item) => <View key={item.month} style={styles.monthRow}><Text style={styles.monthLabel}>{monthLabel(item.month)}</Text><View style={styles.monthBars}><View style={styles.monthBarLine}><Text style={[styles.income, styles.monthBarLabel]}>Entradas</Text><View style={styles.monthBarTrack}><View style={[styles.monthBar, styles.monthIncome, { width: barWidth(item.income, maxMonthly) }]} /></View><Text style={styles.monthBarValue}>{money(item.income)}</Text></View><View style={styles.monthBarLine}><Text style={[styles.expense, styles.monthBarLabel]}>Saídas</Text><View style={styles.monthBarTrack}><View style={[styles.monthBar, styles.monthExpense, { width: barWidth(item.expense, maxMonthly) }]} /></View><Text style={styles.monthBarValue}>{money(item.expense)}</Text></View></View><Text style={[styles.monthNet, item.net < 0 && styles.expense]}>Saldo: {money(item.net)}</Text></View>) : <Text style={styles.muted}>Ainda não há histórico mensal suficiente.</Text>}</View><View style={styles.analyticsPanel}><Text style={styles.sectionTitle}>Comparação com o mês anterior</Text>{data?.category_comparisons?.length ? data.category_comparisons.map((item) => <ComparisonTrendRow item={item} key={item.category} />) : <Text style={styles.muted}>Não há comparação disponível para este período.</Text>}</View><View style={styles.analyticsPanel}><Text style={styles.sectionTitle}>Gastos atípicos</Text><Text style={styles.panelCaption}>Valores acima do padrão da categoria</Text>{data?.outliers?.length ? data.outliers.map((item, index) => <OutlierRow item={item} key={`${item.transaction_id}-${index}`} />) : <Text style={styles.muted}>Nenhum gasto atípico foi detectado com os dados disponíveis.</Text>}</View>{data?.warnings?.filter((warning) => warning !== data?.projection?.warning).map((warning, index) => <View key={index} style={styles.warningBox}><Text style={styles.warningText}>{warning}</Text></View>)}</ScrollView>;
}

function ProfileScreen({ token, user, onUserChange, onLogout }) {
  const [profile, setProfile] = useState(user); const [name, setName] = useState(user?.name || ""); const [avatar, setAvatar] = useState(user?.profileImage || ""); const [busy, setBusy] = useState(false); const [emailModal, setEmailModal] = useState(false); const [passwordModal, setPasswordModal] = useState(false); const [deleteModal, setDeleteModal] = useState(false); const [newEmail, setNewEmail] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [deletePassword, setDeletePassword] = useState("");
  async function load() { try { const next = await request("/auth/me", {}, token); setProfile(next); setName(next.name); setAvatar(next.profileImage || ""); onUserChange(next); } catch (error) { Alert.alert("Erro", error.message); } }
  useEffect(() => { load(); }, []);
  const demo = Boolean(profile?.isDemo);
  async function pickAvatar() { if (demo) return Alert.alert("Conta de demonstração", "Esta conta é somente para leitura."); const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return Alert.alert("Permissão necessária", "Permita o acesso às fotos para alterar sua imagem."); const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true }); if (!result.canceled && result.assets[0]?.base64) setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`); }
  async function saveProfile() { if (!name.trim()) return Alert.alert("Nome obrigatório", "Informe seu nome completo."); setBusy(true); try { const result = await request("/auth/me", { method: "PUT", body: JSON.stringify({ name, profileImage: avatar }) }, token); const next = { ...profile, name: result.name, profileImage: result.profileImage || "" }; setProfile(next); onUserChange(next); Alert.alert("Pronto", "Perfil atualizado com sucesso."); } catch (error) { Alert.alert("Erro", error.message); } finally { setBusy(false); } }
  async function changeEmail() { try { const result = await request("/auth/me/email", { method: "PUT", body: JSON.stringify({ email: newEmail }) }, token); const next = { ...profile, email: result.email }; setProfile(next); onUserChange(next); setEmailModal(false); setNewEmail(""); Alert.alert("Pronto", "E-mail alterado com sucesso."); } catch (error) { Alert.alert("Erro", error.message); } }
  async function changePassword() { if (newPassword !== confirmPassword) return Alert.alert("Senhas diferentes", "A confirmação deve ser igual à nova senha."); try { await request("/auth/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }, token); setPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); Alert.alert("Pronto", "Senha alterada com sucesso."); } catch (error) { Alert.alert("Erro", error.message); } }
  async function deleteAccount() { try { await request("/auth/me", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) }, token); await AsyncStorage.removeItem(TOKEN_KEY); onLogout(); } catch (error) { Alert.alert("Erro", error.message); } }
  return <ScrollView style={styles.flex} contentContainerStyle={styles.dashboard}><View style={styles.profileHero}><Pressable onPress={pickAvatar}><Avatar profileImage={avatar} name={name} size={94} /><View style={styles.cameraBubble}><Text style={styles.cameraText}>✎</Text></View></Pressable><Text style={styles.profileName}>{profile?.name || "Seu perfil"}</Text><Text style={styles.muted}>{profile?.email || ""}</Text><Text style={styles.avatarTip}>Toque na foto para alterar</Text></View>{demo && <View style={styles.warningBox}><Text style={styles.warningText}>A conta de demonstração é somente para leitura.</Text></View>}<View style={styles.profileCard}><Text style={styles.sectionTitle}>Editar perfil</Text><Text style={styles.panelCaption}>Atualize seus dados ou foto de perfil</Text><Field label="Nome completo" value={name} onChangeText={setName} autoCapitalize="words" editable={!demo} /><Text style={styles.label}>E-mail</Text><Pressable disabled={demo} style={styles.accountItem} onPress={() => setEmailModal(true)}><Text style={styles.accountItemValue}>{profile?.email || "Carregando..."}</Text><Text style={styles.linkText}>Alterar</Text></Pressable><Text style={styles.label}>Conta criada em</Text><Text style={styles.accountValue}>{dateLabel(profile?.createdAt)}</Text><Button title={busy ? "Salvando..." : "Salvar alterações"} onPress={saveProfile} Icon={SaveIcon} disabled={busy || demo} /><Button title="Alterar senha" onPress={() => setPasswordModal(true)} Icon={LockIcon} secondary disabled={demo} /><Button title="Excluir usuário" onPress={() => setDeleteModal(true)} Icon={TrashIcon} danger disabled={demo} /><Pressable onPress={onLogout} style={styles.signout}><Text style={styles.signoutText}>Sair da conta</Text></Pressable></View><FormModal visible={emailModal} title="Alterar e-mail" subtitle="Digite seu novo e-mail e confirme a alteração." onClose={() => setEmailModal(false)}><Field label="Novo e-mail" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" placeholder="voce@email.com" /><Button title="Confirmar e-mail" onPress={changeEmail} /></FormModal><FormModal visible={passwordModal} title="Alterar senha" subtitle="Informe sua senha atual e defina uma nova senha." onClose={() => setPasswordModal(false)}><Field label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /><Field label="Nova senha" value={newPassword} onChangeText={setNewPassword} secureTextEntry /><Field label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry /><Button title="Salvar nova senha" onPress={changePassword} /></FormModal><FormModal visible={deleteModal} title="Excluir conta" subtitle="Esta ação é irreversível. Digite sua senha para confirmar." onClose={() => setDeleteModal(false)}><Field label="Senha" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry /><Button title="Excluir conta definitivamente" onPress={deleteAccount} danger /></FormModal></ScrollView>;
}

function FormModal({ visible, title, subtitle, onClose, children }) { return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.modalCard}><Text style={styles.sectionTitle}>{title}</Text><Text style={[styles.muted, styles.modalSubtitle]}>{subtitle}</Text>{children}<Button title="Cancelar" onPress={onClose} secondary /></View></View></Modal>; }
function Tabs({ current, onChange }) {
  const items = [["dashboard", "⌂", "Início"], ["transactions", DollarIcon, "Transações"], ["analytics", PieChartIcon, "Análises"], ["profile", UserIcon, "Perfil"]];
  return <View style={[styles.tabs, styles.tabsAligned]}>{items.map(([key, icon, label]) =>
    <Pressable key={key} style={[styles.tab, styles.tabAligned, current === key && styles.tabActive]} onPress={() => onChange(key)}>
      <View style={styles.tabIconSlot}>
        {typeof icon === "string"
          ? <Text style={[styles.tabIcon, styles.tabIconAligned, current === key && styles.tabTextActive]}>{icon}</Text>
          : React.createElement(icon, { color: current === key ? colors.primary : colors.muted, size: 22 })}
      </View>
      <Text style={[styles.tabText, styles.tabTextAligned, current === key && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  )}</View>;
}

export default function App() {
  const [token, setToken] = useState(null); const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [screen, setScreen] = useState("dashboard");
  useEffect(() => { (async () => { const saved = await AsyncStorage.getItem(TOKEN_KEY); if (saved) { try { const profile = await request("/auth/me", {}, saved); setToken(saved); setUser(profile); } catch { await AsyncStorage.removeItem(TOKEN_KEY); } } setLoading(false); })(); }, []);
  async function logout() { await AsyncStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); setScreen("dashboard"); }
  if (loading) return <AppBackground><SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} size="large" style={styles.center} /></SafeAreaView></AppBackground>;
  if (!token) return <AppBackground><AuthScreen onLogin={(nextToken, profile) => { setToken(nextToken); setUser(profile); }} /></AppBackground>;
  return <AppBackground><SafeAreaView style={styles.safe}><StatusBar style="light" />{screen === "dashboard" && <Dashboard token={token} user={user} onOpenProfile={() => setScreen("profile")} />}{screen === "transactions" && <TransactionsScreen token={token} user={user} onOpenProfile={() => setScreen("profile")} />}{screen === "analytics" && <AnalyticsScreen token={token} user={user} onOpenProfile={() => setScreen("profile")} />}{screen === "profile" && <ProfileScreen token={token} user={user} onUserChange={setUser} onLogout={logout} />}<Tabs current={screen} onChange={setScreen} /></SafeAreaView></AppBackground>;
}

const styles = StyleSheet.create({
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonDangerRefined: { backgroundColor: "#9f2941", borderColor: "#d45168", borderWidth: 1 },
  buttonDangerText: { color: "#ffffff" },
  trendIconNeutral: { backgroundColor: colors.surfaceSoft },
  outlierMain: { flex: 1 },
  outlierRefined: { gap: 10 },
  filterTypeIncomeActive: { backgroundColor: "#147f58" },
  filterTypeExpenseActive: { backgroundColor: "#b8354d" },
  filterTypeTextWhite: { color: "#ffffff" },
  periodCard: { backgroundColor: "#0c182b", borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 16 },
  periodHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  periodLabel: { color: "#90a4c1", fontSize: 11, fontWeight: "800", letterSpacing: .4, flexShrink: 1 },
  periodRange: { color: "#d9e5f4", fontSize: 11, fontWeight: "700" },
  periodCheckRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, minHeight: 30, marginTop: 8 },
  periodCheckbox: { width: 17, height: 17, borderRadius: 4, borderWidth: 1, borderColor: "#a5b8d0", alignItems: "center", justifyContent: "center" },
  periodCheckboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodCheckmark: { color: "#07101e", fontSize: 12, fontWeight: "900", lineHeight: 15 },
  periodCheckText: { color: "#c7d4e6", fontSize: 12 },
  periodMessage: { fontSize: 21, fontWeight: "800", lineHeight: 28, marginTop: 13 },
  periodFilters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 17 },
  periodFilter: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,.045)", borderWidth: 1, borderColor: "rgba(255,255,255,.07)" },
  periodFilterActive: { backgroundColor: "rgba(53,194,255,.14)", borderColor: "rgba(53,194,255,.32)" },
  periodFilterText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  periodFilterTextActive: { color: "#dff5ff" },
  typeHint: { marginTop: 18, marginBottom: 2 },
  typeHintTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  typeHintIncome: { color: colors.income, fontWeight: "800" },
  typeHintExpense: { color: colors.expense, fontWeight: "800" },
  typeHintHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  chipWithIcon: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 38 },
  transactionRefined: { backgroundColor: "#0d192d", borderColor: "#1a2b43" },
  incomeIconRefined: { backgroundColor: "rgba(54,214,161,.12)", borderWidth: 1, borderColor: "rgba(54,214,161,.2)" },
  expenseIconRefined: { backgroundColor: "rgba(255,105,126,.11)", borderWidth: 1, borderColor: "rgba(255,105,126,.2)" },
  transactionAmount: { fontSize: 13, marginTop: 0, textAlign: "right" },
  transactionActions: { flexDirection: "row", justifyContent: "flex-end", gap: 14, marginTop: 8 },
  editAction: { color: colors.primary, fontSize: 11, fontWeight: "700" },
  deleteAction: { color: colors.muted, fontSize: 11 },
  editModalCard: { width: "100%", maxHeight: "92%", backgroundColor: "#0a1426", borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  editModalContent: { padding: 20, paddingBottom: 24 },
  monthBarLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  monthBarLabel: { width: 51, fontSize: 10, fontWeight: "700", marginTop: 0 },
  monthBarTrack: { flex: 1, height: 7, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surfaceSoft },
  monthBarValue: { width: 78, textAlign: "right", color: colors.muted, fontSize: 10 },
  tabsAligned: { backgroundColor: "#07101e", paddingTop: 6, paddingBottom: 10 },
  tabAligned: { height: 58, justifyContent: "center", paddingVertical: 0 },
  tabIconSlot: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  tabIconAligned: { lineHeight: 24, textAlign: "center", includeFontPadding: false },
  tabTextAligned: { height: 14, lineHeight: 14, marginTop: 4, textAlign: "center", includeFontPadding: false },
  safe: { flex: 1, backgroundColor: "transparent" }, flex: { flex: 1 }, center: { flex: 1 }, backgroundImage: { flex: 1, backgroundColor: colors.background }, backgroundImageAsset: { opacity: .28 }, backgroundOverlay: { flex: 1, backgroundColor: "rgba(3,9,20,.82)" }, authContainer: { flexGrow: 1, justifyContent: "center", padding: 28 }, logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 42 }, logoRowCompact: { marginBottom: 0 }, logoEz: { color: colors.primary, fontSize: 26, fontWeight: "900", letterSpacing: .5 }, logoSaldo: { color: colors.text, fontSize: 26, fontWeight: "900", letterSpacing: .5 }, pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 64, marginHorizontal: -20, marginTop: -20, marginBottom: 26, paddingHorizontal: 20, backgroundColor: "rgba(7,15,30,.72)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,.05)" }, headerSpacer: { flex: 1 }, authTitle: { color: colors.text, fontSize: 31, fontWeight: "800", marginBottom: 8 }, authSubtitle: { color: colors.muted, fontSize: 16, marginBottom: 30 }, field: { marginTop: 16 }, label: { color: "#b9c8dc", fontSize: 13, marginBottom: 8, fontWeight: "700" }, input: { backgroundColor: colors.surfaceSoft, borderColor: colors.border, borderWidth: 1, borderRadius: 11, color: colors.text, padding: 15, fontSize: 16 }, dateControl: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.surfaceSoft }, dateControlText: { color: colors.text, fontSize: 15 }, datePlaceholder: { color: colors.muted, fontSize: 15 }, dateIcon: { color: colors.primary, fontSize: 17 }, button: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 11, padding: 15, marginTop: 15 }, buttonSecondary: { backgroundColor: colors.surfaceSoft, borderColor: colors.border, borderWidth: 1 }, buttonDanger: { backgroundColor: "rgba(239,68,68,.2)", borderColor: "rgba(239,68,68,.35)", borderWidth: 1 }, buttonText: { color: "#06111f", fontSize: 16, fontWeight: "800" }, buttonSecondaryText: { color: colors.text }, pressed: { opacity: .75 }, disabled: { opacity: .5 }, error: { color: colors.danger, marginTop: 16 }, success: { color: colors.income, marginTop: 16 }, loader: { marginTop: 14 }, switchText: { color: colors.primary, textAlign: "center", marginTop: 25, fontWeight: "700" }, dashboard: { padding: 20, paddingBottom: 104 }, topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, hello: { color: colors.text, fontSize: 24, fontWeight: "800" }, muted: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 }, avatar: { backgroundColor: "rgba(2,6,23,.94)", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: "rgba(53,194,255,.45)" }, summary: { backgroundColor: colors.surface, borderRadius: 18, borderColor: colors.border, borderWidth: 1, padding: 22, marginBottom: 16 }, summaryLabel: { color: colors.muted, fontSize: 13 }, balance: { color: colors.text, fontSize: 32, fontWeight: "900", marginTop: 7, marginBottom: 24 }, summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingRight: 50 }, income: { color: colors.income, fontWeight: "800", marginTop: 5 }, expense: { color: colors.expense, fontWeight: "800", marginTop: 5 }, incomeSmall: { color: colors.income, fontSize: 12, marginTop: 3 }, expenseSmall: { color: colors.expense, fontSize: 12, marginTop: 3 }, transactionDate: { color: "#8798b3", fontSize: 11, marginTop: 3 }, formCard: { backgroundColor: colors.surface, padding: 17, borderRadius: 16, marginTop: 16, borderColor: colors.border, borderWidth: 1 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" }, categoryLabel: { marginTop: 17 }, chips: { gap: 8, paddingVertical: 10, paddingBottom: 1 }, chip: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surfaceSoft, borderRadius: 18 }, chipSelected: { backgroundColor: colors.primaryDark }, chipText: { color: colors.text, fontSize: 12 }, listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 12 }, empty: { backgroundColor: colors.surface, padding: 24, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border }, emptyTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginBottom: 3 }, transaction: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: "rgba(255,255,255,.04)" }, transactionIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 }, incomeBg: { backgroundColor: "rgba(32,212,107,.12)" }, expenseBg: { backgroundColor: "rgba(255,91,91,.12)" }, transactionIconText: { fontSize: 21, fontWeight: "800", color: colors.text }, transactionMain: { flex: 1 }, transactionTitle: { color: colors.text, fontWeight: "700", fontSize: 14 }, transactionRight: { alignItems: "flex-end" }, delete: { color: colors.muted, fontSize: 11, marginTop: 6 }, tabs: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", backgroundColor: "rgba(7,15,30,.97)", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingBottom: 13 }, tab: { flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 12, marginHorizontal: 2 }, tabActive: { backgroundColor: "rgba(53,194,255,.12)" }, tabIcon: { color: colors.muted, fontSize: 19 }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "700", marginTop: 1 }, tabTextActive: { color: colors.primary }, loaderScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }, screenPadding: { padding: 20, flex: 1 }, analyticsHero: { marginBottom: 20 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.4 }, analyticsTitle: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: 6 }, projectionCard: { backgroundColor: "rgba(13,24,48,.92)", borderColor: "rgba(53,194,255,.25)", borderWidth: 1, padding: 20, borderRadius: 18, marginBottom: 16 }, projectionLabel: { color: "#b5ddff", fontSize: 13, fontWeight: "700" }, projectionValue: { color: colors.primary, fontSize: 29, fontWeight: "900", marginVertical: 7 }, warningText: { color: colors.warning, fontSize: 12, lineHeight: 17, marginTop: 10 }, analyticsPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 13 }, panelCaption: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 12 }, metricRow: { marginTop: 12 }, metricHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 }, metricLabel: { color: colors.text, fontWeight: "700", fontSize: 13 }, metricValue: { color: colors.muted, fontSize: 11 }, barTrack: { backgroundColor: colors.surfaceSoft, height: 8, borderRadius: 8, overflow: "hidden" }, barFill: { backgroundColor: colors.primary, height: 8, borderRadius: 8 }, monthRow: { marginTop: 13 }, monthLabel: { color: colors.muted, fontSize: 11, textTransform: "capitalize", marginBottom: 5 }, monthBars: { gap: 4 }, monthBar: { height: 6, borderRadius: 5 }, monthIncome: { backgroundColor: colors.income }, monthExpense: { backgroundColor: colors.expense }, monthNet: { color: colors.text, fontSize: 11, fontWeight: "700", marginTop: 5, textAlign: "right" }, legend: { flexDirection: "row", gap: 18, marginTop: 15 }, comparison: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, trendIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 }, comparisonText: { flex: 1 }, outlier: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, warningBox: { backgroundColor: "rgba(60,51,33,.9)", borderColor: "#6e5726", borderWidth: 1, padding: 13, borderRadius: 12, marginBottom: 12 }, profileHero: { alignItems: "center", paddingTop: 14, paddingBottom: 22 }, profileName: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 12 }, avatarTip: { color: colors.primary, fontSize: 12, marginTop: 10 }, cameraBubble: { position: "absolute", right: -2, bottom: 0, width: 27, height: 27, borderRadius: 14, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background, alignItems: "center", justifyContent: "center" }, cameraText: { color: colors.background, fontWeight: "900" }, profileCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18 }, accountItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: colors.surfaceSoft, borderRadius: 12, marginBottom: 16 }, accountItemValue: { color: colors.text, fontSize: 14, flex: 1 }, accountValue: { color: colors.text, fontSize: 14, marginBottom: 16 }, linkText: { color: colors.primary, fontWeight: "800" }, signout: { alignItems: "center", paddingTop: 24 }, signoutText: { color: colors.muted, fontWeight: "700" }, modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,.72)", padding: 20 }, modalCard: { backgroundColor: "#0a1224", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.border }, modalSubtitle: { marginTop: 6 }, pageTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 20 }, pageTitleContent: { flex: 1 }, resultsPill: { minWidth: 46, paddingHorizontal: 13, paddingVertical: 9, alignItems: "center", borderRadius: 999, backgroundColor: "rgba(53,194,255,.09)", borderWidth: 1, borderColor: "rgba(53,194,255,.2)" }, resultsPillText: { color: "#dff3ff", fontWeight: "800" }, filterTypeLabel: { marginTop: 16 }, filterTypes: { flexDirection: "row", backgroundColor: "rgba(2,6,23,.7)", padding: 4, borderRadius: 11 }, filterType: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 8 }, filterTypeActive: { backgroundColor: "rgba(53,194,255,.18)" }, filterTypeText: { color: colors.muted, fontWeight: "700", fontSize: 12 }, filterTypeTextActive: { color: colors.primary }, filterValues: { flexDirection: "row", gap: 10 }, filterHalf: { flex: 1 }, filterButtons: { flexDirection: "row", gap: 10 }, filterButton: { flex: 1 }, filterHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14 }, resultsHeading: { marginTop: 8, marginBottom: 10 }
});
