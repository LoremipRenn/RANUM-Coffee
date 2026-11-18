import { PrismaClient, ProductAvailability, ProductBadge, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where: { slug: 'ranum-senopati' },
    update: {},
    create: {
      name: 'RANUM Coffee — Senopati',
      slug: 'ranum-senopati',
      address: 'Jl. Suryo No. 28, Kebayoran Baru, Jakarta Selatan',
      phone: '+62 21 5550 1928',
      openHours: '07:00 - 22:00 WIB',
      isOpen: true,
      taxRatePercent: 10,
      serviceChargePercent: 5,
      allowPayAtCashier: true,
      requireCashierConfirm: false,
      currency: 'IDR',
    },
  });

  const staffAccounts = [
    { name: 'Raka Pratama (Owner)', email: 'admin@ranumcoffee.id', role: Role.ADMIN, pass: 'RanumAdmin2026!' },
    { name: 'Sinta Wijaya (Kasir)', email: 'kasir@ranumcoffee.id', role: Role.CASHIER, pass: 'RanumKasir2026!' },
    { name: 'Dimas Ardi (Barista)', email: 'barista@ranumcoffee.id', role: Role.BARISTA, pass: 'RanumBarista2026!' },
    { name: 'Nadia Putri (Waiter)', email: 'waiter@ranumcoffee.id', role: Role.WAITER, pass: 'RanumWaiter2026!' },
  ];

  for (const acc of staffAccounts) {
    const passwordHash = await bcrypt.hash(acc.pass, 10);
    await prisma.user.upsert({
      where: { email: acc.email },
      update: { name: acc.name, role: acc.role, isActive: true },
      create: {
        branchId: branch.id,
        name: acc.name,
        email: acc.email,
        passwordHash,
        role: acc.role,
        isActive: true,
      },
    });
  }

  const tablesData = [
    { code: 'T-01', name: 'Meja 01', area: 'Indoor Window', capacity: 2, token: 'ranum-meja-01-senopati-8f3a' },
    { code: 'T-02', name: 'Meja 02', area: 'Indoor Lounge', capacity: 4, token: 'ranum-meja-02-senopati-4c9b' },
    { code: 'T-03', name: 'Meja 03', area: 'Indoor Lounge', capacity: 4, token: 'ranum-meja-03-senopati-7d1e' },
    { code: 'T-04', name: 'Meja 04', area: 'Slow Bar', capacity: 2, token: 'ranum-meja-04-senopati-2a6f' },
    { code: 'T-05', name: 'Meja 05', area: 'Courtyard', capacity: 6, token: 'ranum-meja-05-senopati-9e5c' },
    { code: 'T-06', name: 'Meja 06', area: 'Courtyard', capacity: 4, token: 'ranum-meja-06-senopati-1b8d' },
  ];

  for (const t of tablesData) {
    const table = await prisma.diningTable.upsert({
      where: { branchId_code: { branchId: branch.id, code: t.code } },
      update: { name: t.name, area: t.area, capacity: t.capacity },
      create: {
        branchId: branch.id,
        code: t.code,
        name: t.name,
        area: t.area,
        capacity: t.capacity,
      },
    });

    const existingQr = await prisma.tableQrCode.findFirst({
      where: { tableId: table.id, status: 'ACTIVE' },
    });
    if (!existingQr) {
      await prisma.tableQrCode.create({
        data: {
          tableId: table.id,
          token: t.token,
          status: 'ACTIVE',
        },
      });
    }
  }

  const categoriesData = [
    { name: 'Signature Coffee', slug: 'signature-coffee', sortOrder: 1 },
    { name: 'Manual Brew', slug: 'manual-brew', sortOrder: 2 },
    { name: 'Non-Coffee', slug: 'non-coffee', sortOrder: 3 },
    { name: 'Artisan Pastry', slug: 'artisan-pastry', sortOrder: 4 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { branchId_slug: { branchId: branch.id, slug: cat.slug } },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: {
        branchId: branch.id,
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    categoryMap.set(cat.slug, created.id);
  }

  const standardCoffeeOptions = [
    {
      name: 'Suhu',
      isRequired: true,
      allowMultiple: false,
      values: [
        { name: 'Iced', additionalPrice: 0, isDefault: true },
        { name: 'Hot', additionalPrice: 0, isDefault: false },
      ],
    },
    {
      name: 'Ukuran',
      isRequired: true,
      allowMultiple: false,
      values: [
        { name: 'Regular (240ml)', additionalPrice: 0, isDefault: true },
        { name: 'Large (350ml)', additionalPrice: 6000, isDefault: false },
      ],
    },
    {
      name: 'Tingkat Gula',
      isRequired: true,
      allowMultiple: false,
      values: [
        { name: 'Normal Sugar', additionalPrice: 0, isDefault: true },
        { name: 'Less Sugar', additionalPrice: 0, isDefault: false },
        { name: 'No Sugar', additionalPrice: 0, isDefault: false },
      ],
    },
    {
      name: 'Pilihan Susu',
      isRequired: false,
      allowMultiple: false,
      values: [
        { name: 'Fresh Milk', additionalPrice: 0, isDefault: true },
        { name: 'Oat Milk', additionalPrice: 8000, isDefault: false },
        { name: 'Soy Milk', additionalPrice: 6000, isDefault: false },
      ],
    },
  ];

  const standardCoffeeAddons = [
    { name: 'Extra Espresso Shot', price: 7000 },
    { name: 'Salted Caramel Drizzle', price: 5000 },
    { name: 'Espresso Jelly', price: 6000 },
  ];

  const productsData = [
    {
      categorySlug: 'signature-coffee',
      name: 'Es Kopi Susu Ranum',
      slug: 'es-kopi-susu-ranum',
      description:
        'House blend Arabika Gayo & Flores dengan gula aren organik Banyumas, susu segar dingin, dan sentuhan sea salt cream.',
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
      basePrice: 32000,
      badge: ProductBadge.BEST_SELLER,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: standardCoffeeOptions,
      addons: standardCoffeeAddons,
    },
    {
      categorySlug: 'signature-coffee',
      name: 'Kopi Rempah Nusantara',
      slug: 'kopi-rempah-nusantara',
      description:
        'Espresso double ristretto dipadukan dengan infusi kayu manis, kapulaga, jahe merah, dan foam susu lembut.',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80',
      basePrice: 38000,
      badge: ProductBadge.RECOMMENDED,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: standardCoffeeOptions,
      addons: standardCoffeeAddons,
    },
    {
      categorySlug: 'signature-coffee',
      name: 'Caramelized Oat Cortado',
      slug: 'caramelized-oat-cortado',
      description:
        'Keseimbangan espresso medium roast dan oat milk bertekstur velvety dengan lapisan gula karamel tipis.',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
      basePrice: 40000,
      badge: ProductBadge.NEW,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: standardCoffeeOptions.slice(0, 3),
      addons: standardCoffeeAddons.slice(0, 2),
    },
    {
      categorySlug: 'manual-brew',
      name: 'V60 Aceh Gayo Pantan Musara',
      slug: 'v60-aceh-gayo-pantan-musara',
      description:
        'Single origin natural process dengan catatan rasa dark berry, cacao nibs, dan aftertaste manis yang bersih.',
      imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
      basePrice: 42000,
      badge: ProductBadge.RECOMMENDED,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: [standardCoffeeOptions[0]],
      addons: [],
    },
    {
      categorySlug: 'manual-brew',
      name: 'Japanese Iced Toraja Sapan',
      slug: 'japanese-iced-toraja-sapan',
      description:
        'Diseduh langsung di atas es batu untuk mengunci aroma jeruk bali, teh hitam, dan rempah ringan khas Toraja.',
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80',
      basePrice: 44000,
      badge: ProductBadge.NONE,
      availability: ProductAvailability.ACTIVE,
      isFeatured: false,
      options: [],
      addons: [],
    },
    {
      categorySlug: 'non-coffee',
      name: 'Uji Ceremonial Matcha Latte',
      slug: 'uji-ceremonial-matcha-latte',
      description:
        'Matcha grade seremonial dari Uji, Kyoto, dikocok dengan whisk bambu dan dipadukan dengan susu pilihan.',
      imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80',
      basePrice: 42000,
      badge: ProductBadge.BEST_SELLER,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: standardCoffeeOptions,
      addons: [{ name: 'Extra Matcha Shot', price: 10000 }],
    },
    {
      categorySlug: 'non-coffee',
      name: 'Dark Cacao Flores',
      slug: 'dark-cacao-flores',
      description:
        'Cokelat hitam 70% asal Manggarai, Flores yang kaya rasa dengan sedikit sea salt dan tekstur creamy.',
      imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=900&q=80',
      basePrice: 36000,
      badge: ProductBadge.NONE,
      availability: ProductAvailability.ACTIVE,
      isFeatured: false,
      options: standardCoffeeOptions,
      addons: [{ name: 'Whipped Cream', price: 5000 }],
    },
    {
      categorySlug: 'artisan-pastry',
      name: 'Brown Butter Pain au Chocolat',
      slug: 'brown-butter-pain-au-chocolat',
      description:
        'Pastry berlapis renyah menggunakan mentega Prancis kecokelatan dengan isian batang dark chocolate.',
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80',
      basePrice: 34000,
      badge: ProductBadge.BEST_SELLER,
      availability: ProductAvailability.ACTIVE,
      isFeatured: true,
      options: [
        {
          name: 'Penyajian',
          isRequired: true,
          allowMultiple: false,
          values: [
            { name: 'Hangatkan', additionalPrice: 0, isDefault: true },
            { name: 'Suhu Ruang', additionalPrice: 0, isDefault: false },
          ],
        },
      ],
      addons: [],
    },
    {
      categorySlug: 'artisan-pastry',
      name: 'Klappertaart Burnt Cheesecake',
      slug: 'klappertaart-burnt-cheesecake',
      description:
        'Basque burnt cheesecake lembut dengan aroma kelapa bakar, kismis, dan taburan kayu manis.',
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80',
      basePrice: 45000,
      badge: ProductBadge.NEW,
      availability: ProductAvailability.ACTIVE,
      isFeatured: false,
      options: [],
      addons: [],
    },
  ];

  for (let idx = 0; idx < productsData.length; idx++) {
    const p = productsData[idx];
    const categoryId = categoryMap.get(p.categorySlug)!;
    const existing = await prisma.product.findUnique({
      where: { branchId_slug: { branchId: branch.id, slug: p.slug } },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          branchId: branch.id,
          categoryId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          imageUrl: p.imageUrl,
          basePrice: p.basePrice,
          badge: p.badge,
          availability: p.availability,
          isFeatured: p.isFeatured,
          sortOrder: idx + 1,
          optionGroups: {
            create: p.options.map((g, gIdx) => ({
              name: g.name,
              isRequired: g.isRequired,
              allowMultiple: g.allowMultiple,
              sortOrder: gIdx,
              values: {
                create: g.values.map((v, vIdx) => ({
                  name: v.name,
                  additionalPrice: v.additionalPrice,
                  isDefault: v.isDefault,
                  sortOrder: vIdx,
                })),
              },
            })),
          },
          addons: {
            create: p.addons.map((a) => ({
              name: a.name,
              price: a.price,
              isActive: true,
            })),
          },
        },
      });
    }
  }

  console.log('Seeded RANUM Coffee database successfully.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
