import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

// Define categories matching the app structure
const categories = {
  expense: ['Food & Dining', 'Rent', 'Shopping', 'Entertainment', 'Transport', 'Utilities'],
  income: ['Salary', 'Freelance', 'Investments']
};

const transactions = [];

// Generate ~300 transactions spread across the last 6 months (180 days)
for (let i = 0; i < 300; i++) {
  const isIncome = Math.random() > 0.85;
  const type = isIncome ? 'income' : 'expense';
  const catArray = categories[type];
  const category = catArray[Math.floor(Math.random() * catArray.length)];
  
  // Set realistic boundaries for Rupees
  const amount = isIncome 
    ? faker.number.int({ min: 40000, max: 120000 }) 
    : faker.number.int({ min: 100, max: 15000 });
    
  // Generate a random date in the last 180 days
  const date = faker.date.recent({ days: 180 }).toISOString().split('T')[0];

  transactions.push({
    id: faker.string.alphanumeric(9),
    date,
    amount,
    category,
    type,
    description: faker.finance.transactionDescription()
  });
}

// Sort descending by date
transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const outputPath = path.resolve('public', 'mockData.json');

fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

console.log(`✅ Successfully generated ${transactions.length} mock transactions and saved to ${outputPath}`);
