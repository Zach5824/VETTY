from app import get_db

INITIAL_PRODUCTS = [
    {
        "name": "Ergonomic Dog Harness",
        "description": "Padded breathable mesh harness with reflective safety strips.",
        "price": 24.99,
        "category": "Dogs",
        "image_url": "/images/dog-harness.jpg",
        "stock": 15
    },
    {
        "name": "Interactive Cat Laser & Feather Toy",
        "description": "Automatic 360-degree rotating laser light for active cats.",
        "price": 18.50,
        "category": "Cats",
        "image_url": "/images/cat-laser.jpg",
        "stock": 25
    },
    {
        "name": "Stainless Steel Double Pet Bowl",
        "description": "Non-spill silicone mat with dual rust-resistant steel feeding bowls.",
        "price": 15.99,
        "category": "Accessories",
        "image_url": "/images/pet-bowl.jpg",
        "stock": 30
    }
]

def seed_database():
    with get_db() as conn:
        with conn.cursor() as cur:
            for item in INITIAL_PRODUCTS:
                cur.execute("""
                    INSERT INTO products (name, description, price, category, image_url, stock)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    item["name"], 
                    item["description"], 
                    item["price"], 
                    item["category"], 
                    item["image_url"], 
                    item["stock"]
                ))
            conn.commit()
    print("Database successfully seeded with initial products.")

if __name__ == "__main__":
    seed_database()