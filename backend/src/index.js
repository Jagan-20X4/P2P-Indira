import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const PORT = process.env.PORT || 4050;
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ ok: true, port: PORT });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
