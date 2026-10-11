# EZSaldo Mobile

Versão inicial em Expo/React Native do EZSaldo. O app usa o mesmo backend da versão web:

O projeto está configurado para **Expo SDK 57**, compatível com o Expo Go SDK 57.

## Recursos incluídos

- Painel de saldo, entradas, saídas e transações.
- Histórico completo com filtros por período, tipo e faixa de valor.
- Análise financeira: gastos por categoria, evolução mensal, comparação de categorias, gastos atípicos e projeção de saldo.
- Perfil: foto, nome, email, senha e exclusão de conta com confirmação por senha.

O Metro está configurado para reutilizar `frontend/assets/background-ds.jpg` e `frontend/assets/avatar-default.png`, mantendo a identidade visual e evitando cópias duplicadas.

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET/POST/DELETE /api/transactions`

## Rodar

```powershell
npm install
npx expo install --fix
npm start
```

Por padrão, o app aponta para `https://ezsaldo-backend.onrender.com/api`. Para usar um backend local em um celular físico, informe o IP da máquina na rede:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.0.10:5000/api"
npm start
```

No Android Emulator, normalmente use `http://10.0.2.2:5000/api`.
