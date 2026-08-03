import { PrismaClient, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@financecontrol.com' },
    update: {},
    create: {
      name: 'Usuário Demo',
      email: 'demo@financecontrol.com',
      passwordHash,
    },
  });

  const categoriesData = [
    { name: 'Alimentação', color: '#3B82F6' },
    { name: 'Transporte', color: '#0EA5E9' },
    { name: 'Moradia', color: '#6366F1' },
    { name: 'Lazer', color: '#F59E0B' },
    { name: 'Saúde', color: '#EF4444' },
    { name: 'Educação', color: '#10B981' },
    { name: 'Salário', color: '#22C55E' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: {},
      create: { ...cat, userId: user.id },
    });
    categories.push(category);
  }

  const findCategory = (name: string) => categories.find((c) => c.name === name)!;

  await prisma.transaction.createMany({
    data: [
      {
        description: 'Salário mensal',
        amount: 5500,
        type: TransactionType.INCOME,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 5),
        userId: user.id,
        categoryId: findCategory('Salário').id,
      },
      {
        description: 'Supermercado',
        amount: 620.5,
        type: TransactionType.EXPENSE,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 8),
        userId: user.id,
        categoryId: findCategory('Alimentação').id,
      },
      {
        description: 'Aluguel',
        amount: 1800,
        type: TransactionType.EXPENSE,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
        userId: user.id,
        categoryId: findCategory('Moradia').id,
      },
      {
        description: 'Uber',
        amount: 45.9,
        type: TransactionType.EXPENSE,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
        userId: user.id,
        categoryId: findCategory('Transporte').id,
      },
      {
        description: 'Cinema',
        amount: 60,
        type: TransactionType.EXPENSE,
        date: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
        userId: user.id,
        categoryId: findCategory('Lazer').id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed concluído. Login demo: demo@financecontrol.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
