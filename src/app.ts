import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app; 