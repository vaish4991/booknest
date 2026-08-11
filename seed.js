const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./backend/models/User');
const Book = require('./backend/models/Book');
const Order = require('./backend/models/Order');
const Cart = require('./backend/models/Cart');
const Review = require('./backend/models/Review');

dotenv.config();

const books = [
  // Programming
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    publisher: "Prentice Hall",
    isbn: "9780132350884",
    description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code. But it doesn't have to be that way. Noted software expert Robert C. Martin presents a revolutionary paradigm with Clean Code: A Handbook of Agile Software Craftsmanship.",
    category: "Programming",
    price: 999,
    discount: 10,
    stock: 25,
    coverImage: "https://covers.openlibrary.org/b/id/8291585-L.jpg",
    rating: 4.8,
    reviewCount: 15,
    salesCount: 120
  },
  {
    title: "JavaScript: The Good Parts",
    author: "Douglas Crockford",
    publisher: "O'Reilly Media",
    isbn: "9780596517748",
    description: "Most programming languages contain good and bad parts, but JavaScript has more than its share of the bad, having been developed and released in a hurry before it could be refined. This authoritative book scrapes away these bad features to reveal a subset of JavaScript that's more reliable, readable, and maintainable than the language as a whole.",
    category: "Programming",
    price: 699,
    discount: 15,
    stock: 15,
    coverImage: "https://covers.openlibrary.org/b/id/9253457-L.jpg",
    rating: 4.5,
    reviewCount: 9,
    salesCount: 85
  },
  {
    title: "Eloquent JavaScript, 3rd Edition",
    author: "Marijn Haverbeke",
    publisher: "No Starch Press",
    isbn: "9781593279509",
    description: "JavaScript lies at the heart of almost every modern web application, from social apps like Twitter to browser-based game frameworks like Phaser and Babylon. Though simple for beginners to pick up and play with, JavaScript is a flexible, complex language that you can use to build full-scale applications.",
    category: "Programming",
    price: 899,
    discount: 12,
    stock: 30,
    coverImage: "https://covers.openlibrary.org/b/id/10523493-L.jpg",
    rating: 4.7,
    reviewCount: 12,
    salesCount: 110
  },
  {
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    publisher: "MIT Press",
    isbn: "9780262033848",
    description: "A comprehensive update of the leading algorithms text, with new material on matchings in bipartite graphs, online algorithms, machine learning, and other topics. Some books on algorithms are rigorous but incomplete; others cover masses of material but lack rigor. Introduction to Algorithms uniquely combines rigor and comprehensiveness.",
    category: "Programming",
    price: 1899,
    discount: 5,
    stock: 10,
    coverImage: "https://covers.openlibrary.org/b/id/8315545-L.jpg",
    rating: 4.9,
    reviewCount: 22,
    salesCount: 95
  },

  // Fiction
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    publisher: "J. B. Lippincott & Co.",
    isbn: "9780446310789",
    description: "Compassionate, dramatic, and deeply moving, To Kill A Mockingbird takes readers to the roots of human behavior - to innocence and experience, kindness and cruelty, love and hatred, humor and pathos. Now with over 18 million copies in print and translated into forty languages, this regional story by a young Alabama woman is an indisputable masterpiece of American literature.",
    category: "Fiction",
    price: 399,
    discount: 20,
    stock: 50,
    coverImage: "https://covers.openlibrary.org/b/id/8225266-L.jpg",
    rating: 4.9,
    reviewCount: 45,
    salesCount: 240
  },
  {
    title: "1984",
    author: "George Orwell",
    publisher: "Secker & Warburg",
    isbn: "9780451524935",
    description: "Written in 1948, 1984 was George Orwell's chilling prophecy about the future. And while 1984 has come and gone, his dystopian vision of a government that will do anything to control the narrative is timelier than ever. Nominated as one of America's best-loved novels by PBS's The Great American Read.",
    category: "Fiction",
    price: 299,
    discount: 10,
    stock: 40,
    coverImage: "https://covers.openlibrary.org/b/id/12836262-L.jpg",
    rating: 4.8,
    reviewCount: 38,
    salesCount: 190
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    publisher: "Charles Scribner's Sons",
    isbn: "9780743273565",
    description: "The Great Gatsby, F. Scott Fitzgerald's third book, stands as the supreme achievement of his career. This exemplary novel of the Jazz Age has been acclaimed by generations of readers. The story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan, of lavish parties on Long Island is an exquisitely crafted tale of America in the 1920s.",
    category: "Fiction",
    price: 349,
    discount: 15,
    stock: 35,
    coverImage: "https://covers.openlibrary.org/b/id/12693895-L.jpg",
    rating: 4.6,
    reviewCount: 29,
    salesCount: 160
  },

  // Novels
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    publisher: "HarperTorch",
    isbn: "9780061122415",
    description: "Paulo Coelho's masterpiece tells the mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest will lead him to riches far different—and far more satisfying—than he ever imagined. Santiago's journey teaches us about the essential wisdom of listening to our hearts.",
    category: "Novels",
    price: 299,
    discount: 25,
    stock: 60,
    coverImage: "https://covers.openlibrary.org/b/id/12834241-L.jpg",
    rating: 4.7,
    reviewCount: 52,
    salesCount: 310
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    publisher: "Chilton Books",
    isbn: "9780441172719",
    description: "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the 'spice' melange, a drug capable of extending life and enhancing consciousness. Coveted across the known universe, melange is a prize worth killing for.",
    category: "Novels",
    price: 599,
    discount: 5,
    stock: 20,
    coverImage: "https://covers.openlibrary.org/b/id/12918889-L.jpg",
    rating: 4.8,
    reviewCount: 31,
    salesCount: 145
  },
  {
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    publisher: "George Allen & Unwin",
    isbn: "9780345339683",
    description: "Written for J.R.R. Tolkien's own children, The Hobbit met with instant critical acclaim when it was first published in 1937. Now recognized as a classic in children's literature, this book tells the story of Bilbo Baggins, a quiet, home-loving hobbit whose life is turned upside down when he joins the wizard Gandalf on a quest.",
    category: "Novels",
    price: 499,
    discount: 10,
    stock: 28,
    coverImage: "https://covers.openlibrary.org/b/id/12818862-L.jpg",
    rating: 4.9,
    reviewCount: 40,
    salesCount: 180
  },

  // Business
  {
    title: "The Lean Startup",
    author: "Eric Ries",
    publisher: "Crown Business",
    isbn: "9780307887894",
    description: "Most startups fail. But many of those failures are preventable. The Lean Startup is a new approach being adopted across the globe, changing the way companies are built and new products are launched. Eric Ries defines a startup as an organization dedicated to creating something new under conditions of extreme uncertainty.",
    category: "Business",
    price: 799,
    discount: 20,
    stock: 22,
    coverImage: "https://covers.openlibrary.org/b/id/11145151-L.jpg",
    rating: 4.6,
    reviewCount: 17,
    salesCount: 98
  },
  {
    title: "Zero to One",
    author: "Peter Thiel",
    publisher: "Crown Business",
    isbn: "9780804139298",
    description: "If you build something new, you go from 0 to 1. The next Bill Gates will not build an operating system. The next Larry Page or Sergey Brin won't make a search engine. If you are copying these guys, you aren't learning from them. It's easier to copy a model than to make something new: doing what we already know how to do takes the world from 1 to n, adding more of something familiar.",
    category: "Business",
    price: 650,
    discount: 15,
    stock: 18,
    coverImage: "https://covers.openlibrary.org/b/id/9269974-L.jpg",
    rating: 4.7,
    reviewCount: 20,
    salesCount: 115
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    publisher: "Warner Books",
    isbn: "9781612680194",
    description: "Rich Dad Poor Dad is Robert's story of growing up with two dads — his real father and the father of his best friend, his rich dad — and the ways in which both men shaped his thoughts about money and investing. The book explodes the myth that you need to earn a high income to be rich and explains the difference between working for money and having your money work for you.",
    category: "Business",
    price: 499,
    discount: 30,
    stock: 45,
    coverImage: "https://covers.openlibrary.org/b/id/12815777-L.jpg",
    rating: 4.5,
    reviewCount: 34,
    salesCount: 210
  },

  // Technology
  {
    title: "The Innovators",
    author: "Walter Isaacson",
    publisher: "Simon & Schuster",
    isbn: "9781476708690",
    description: "Following his blockbuster biography of Steve Jobs, Walter Isaacson explains the story of the people who created the computer and the Internet. Written as a standard history of the digital age, The Innovators is a saga of how collaborative teamwork led to inventions that changed the world.",
    category: "Technology",
    price: 899,
    discount: 10,
    stock: 12,
    coverImage: "https://covers.openlibrary.org/b/id/8315181-L.jpg",
    rating: 4.6,
    reviewCount: 11,
    salesCount: 65
  },
  {
    title: "Superintelligence",
    author: "Nick Bostrom",
    publisher: "Oxford University Press",
    isbn: "9780199678112",
    description: "Superintelligence asks the questions: What happens when machines surpass humans in general intelligence? Will artificial agents save or destroy us? Nick Bostrom lays the foundation for understanding the future of humanity and intelligent life.",
    category: "Technology",
    price: 950,
    discount: 8,
    stock: 3, // Low stock on purpose
    coverImage: "https://covers.openlibrary.org/b/id/8282361-L.jpg",
    rating: 4.4,
    reviewCount: 8,
    salesCount: 45
  },

  // Science
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    publisher: "Bantam Books",
    isbn: "9780553380163",
    description: "A landmark volume in science writing by one of the great minds of our time, Stephen Hawking's book explores the secrets of the universe from the Big Bang to black holes, in language that is accessible to all readers.",
    category: "Science",
    price: 450,
    discount: 15,
    stock: 25,
    coverImage: "https://covers.openlibrary.org/b/id/12836263-L.jpg",
    rating: 4.8,
    reviewCount: 27,
    salesCount: 130
  },
  {
    title: "Cosmos",
    author: "Carl Sagan",
    publisher: "Random House",
    isbn: "9780345331359",
    description: "Cosmos is one of the bestselling science books of all time. With beautiful prose, Carl Sagan guides us through fifteen billion years of cosmic evolution, exploring science, philosophy, and our place in the universe.",
    category: "Science",
    price: 499,
    discount: 10,
    stock: 20,
    coverImage: "https://covers.openlibrary.org/b/id/9253509-L.jpg",
    rating: 4.9,
    reviewCount: 21,
    salesCount: 112
  },

  // History
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    publisher: "Harper",
    isbn: "9780062316097",
    description: "100,000 years ago, at least six human species inhabited the earth. Today there is only one. Homo Sapiens. How did our species succeed in the battle for dominance? Sapiens integrates history and science to reconsider common narratives.",
    category: "History",
    price: 599,
    discount: 22,
    stock: 35,
    coverImage: "https://covers.openlibrary.org/b/id/12918881-L.jpg",
    rating: 4.7,
    reviewCount: 42,
    salesCount: 225
  },
  {
    title: "Guns, Germs, and Steel",
    author: "Jared Diamond",
    publisher: "W. W. Norton & Company",
    isbn: "9780393317558",
    description: "Winner of the Pulitzer Prize, Guns, Germs, and Steel explains why Eurasian and North African civilizations survived and conquered others, arguing against racist theories of cultural superiority.",
    category: "History",
    price: 550,
    discount: 12,
    stock: 14,
    coverImage: "https://covers.openlibrary.org/b/id/8315182-L.jpg",
    rating: 4.5,
    reviewCount: 15,
    salesCount: 75
  },

  // Self-Help
  {
    title: "Atomic Habits",
    author: "James Clear",
    publisher: "Avery",
    isbn: "9780735211292",
    description: "No matter your goals, Atomic Habits offers a proven framework for improving—every day. James Clear, one of the world's leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.",
    category: "Self-Help",
    price: 650,
    discount: 18,
    stock: 55,
    coverImage: "https://covers.openlibrary.org/b/id/12836267-L.jpg",
    rating: 4.9,
    reviewCount: 61,
    salesCount: 380
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
    publisher: "Grand Central Publishing",
    isbn: "9781455586691",
    description: "One of the most valuable skills in our economy is becoming increasingly rare. If you master this skill, you'll achieve extraordinary results. Cal Newport teaches readers how to focus without distraction on cognitively demanding tasks.",
    category: "Self-Help",
    price: 550,
    discount: 15,
    stock: 22,
    coverImage: "https://covers.openlibrary.org/b/id/12834247-L.jpg",
    rating: 4.7,
    reviewCount: 23,
    salesCount: 135
  },

  // Competitive Exams
  {
    title: "Word Power Made Easy",
    author: "Norman Lewis",
    publisher: "Pocket Books",
    isbn: "9780671741907",
    description: "The most effective English vocabulary builder in the English language! Word Power Made Easy is the go-to book for students preparing for competitive examinations like GRE, GMAT, SAT, CAT, and bank exams.",
    category: "Competitive Exams",
    price: 199,
    discount: 25,
    stock: 100,
    coverImage: "https://covers.openlibrary.org/b/id/10515151-L.jpg",
    rating: 4.7,
    reviewCount: 30,
    salesCount: 290
  },
  {
    title: "Quantitative Aptitude",
    author: "R.S. Aggarwal",
    publisher: "S. Chand Publishing",
    isbn: "9789352535323",
    description: "Quantitative Aptitude for Competitive Examinations is an indispensable book for candidates preparing for UPSC, SSC, Banking, Railways, MBA, and other competitive recruitment exams.",
    category: "Competitive Exams",
    price: 699,
    discount: 10,
    stock: 40,
    coverImage: "https://covers.openlibrary.org/b/id/8315183-L.jpg",
    rating: 4.6,
    reviewCount: 18,
    salesCount: 175
  }
];

const seedDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/booknest';
    console.log(`Connecting to MongoDB at: ${connStr}`);
    await mongoose.connect(connStr);

    console.log('Clearing database collections...');
    await Book.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Review.deleteMany({});
    console.log('Database cleared!');

    console.log('Creating Admin Account...');
    // schema pre-save hook handles hashing passwordHash
    const adminUser = await User.create({
      name: "BookNest Admin",
      email: "admin@booknest.com",
      mobile: "9876543210",
      passwordHash: "admin123", // Will be hashed automatically by User pre-save hook
      role: "admin",
      isActive: true
    });
    console.log(`Admin user created: ${adminUser.email} (Password: admin123)`);

    console.log('Creating Customer Account...');
    const customerUser = await User.create({
      name: "John Doe",
      email: "customer@booknest.com",
      mobile: "9876543211",
      passwordHash: "customer123", // Will be hashed automatically
      role: "customer",
      isActive: true,
      addresses: [
        {
          fullName: "John Doe",
          mobile: "9876543211",
          addressLine: "123, Reading Lane, Library Colony",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          isDefault: true
        }
      ]
    });
    console.log(`Customer user created: ${customerUser.email} (Password: customer123)`);

    console.log(`Seeding ${books.length} Books...`);
    const createdBooks = await Book.insertMany(books);
    console.log('Books seeded successfully!');

    // Create a mock order to make stats look nice
    console.log('Creating a dummy order for statistics...');
    const book1 = createdBooks[0];
    const book2 = createdBooks[4];

    const subtotal = (book1.price * 1) + (book2.price * 2);
    const discount = (book1.price * (book1.discount/100) * 1) + (book2.price * (book2.discount/100) * 2);
    const tax = Math.round((subtotal - discount) * 0.05 * 100) / 100;
    const shipping = (subtotal - discount) > 500 ? 0 : 50;
    const totalAmount = (subtotal - discount) + tax + shipping;

    const dummyOrder = await Order.create({
      userId: customerUser._id,
      items: [
        {
          bookId: book1._id,
          title: book1.title,
          price: book1.price,
          discount: book1.discount,
          quantity: 1
        },
        {
          bookId: book2._id,
          title: book2.title,
          price: book2.price,
          discount: book2.discount,
          quantity: 2
        }
      ],
      shippingAddress: {
        fullName: customerUser.name,
        email: customerUser.email,
        mobile: customerUser.mobile,
        addressLine: customerUser.addresses[0].addressLine,
        city: customerUser.addresses[0].city,
        state: customerUser.addresses[0].state,
        pincode: customerUser.addresses[0].pincode
      },
      paymentMethod: "COD",
      paymentStatus: "Pending",
      orderStatus: "Delivered", // Set to Delivered so revenue calculations match
      subtotal,
      discount,
      tax,
      shipping,
      totalAmount,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2) // 2 days ago
    });

    console.log(`Dummy order created with status Delivered. Amount: ${totalAmount}`);

    // Create a review
    console.log('Creating a dummy review...');
    await Review.create({
      userId: customerUser._id,
      bookId: book1._id,
      rating: 5,
      comment: "Absolutely loved this! Essential reading for any software engineer. The code styling principles are explained clearly with great examples."
    });

    console.log('Database seeding finished successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedDB();
