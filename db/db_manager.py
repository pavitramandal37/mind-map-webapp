"""
Mind Map Database Manager
=========================

AVAILABLE COMMANDS:

VIEW COMMANDS:
  view-users              View all users with their associated map IDs
  view-maps               View all mind maps with user information
  view-all                View complete database (users + maps)

EXPORT COMMANDS:
  export-data             Export database to JSON or CSV file
                          Options: --format [json|csv] --output [filename]

DELETE COMMANDS:
  delete-users            Delete one or multiple users (and their maps)
                          Usage: delete-users 1 2 3 [--force]
  delete-maps             Delete one or multiple mind maps
                          Usage: delete-maps 1 2 3 [--force]

UPDATE COMMANDS:
  update-user             Update user details (email, password)
  update-map              Update mind map details (title)

EXAMPLES:
  python db_manager.py view-all
  python db_manager.py delete-users 1 2 --force
  python db_manager.py export-data --format json --output backup.json
"""

import sqlite3
import argparse
import sys
import os
import json
import csv
import hashlib
from passlib.context import CryptContext
from datetime import datetime

# Configure password hashing (must match app/auth.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = os.path.join(os.path.dirname(__file__), "mindmap.db")

def get_db_connection():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_password_hash(password):
    """Hash password using the same logic as the main app."""
    hashed_input = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(hashed_input)

def view_users(args):
    """View all users with their map IDs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get all users
        cursor.execute("SELECT * FROM users ORDER BY id")
        users = cursor.fetchall()
        
        print("\n" + "="*120)
        print("USER DATA (with associated Map IDs)")
        print("="*120)
        
        if not users:
            print("No users found.")
            return
        
        for user in users:
            # Get all maps for this user
            cursor.execute("SELECT id, title FROM mindmaps WHERE user_id = ? ORDER BY id", (user['id'],))
            maps = cursor.fetchall()
            
            map_ids = ', '.join([str(m['id']) for m in maps]) if maps else 'None'
            
            print(f"\nUser ID: {user['id']}")
            print(f"  Email:            {user['email']}")
            print(f"  Hashed Password:  {user['hashed_password'][:50]}...")
            print(f"  Hint:             {user['hint'] or 'N/A'}")
            print(f"  Map IDs:          {map_ids}")
            print(f"  Total Maps:       {len(maps)}")
            
            if maps:
                print(f"  Map Details:")
                for m in maps:
                    print(f"    - ID {m['id']}: {m['title']}")
        
        print(f"\n{'='*120}")
        print(f"TOTAL USERS: {len(users)}")
        print(f"{'='*120}\n")
    finally:
        conn.close()

def view_maps(args):
    """View all mind maps with user information."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
        SELECT 
            m.id as map_id,
            m.title,
            m.data,
            m.user_id,
            m.created_at,
            m.updated_at,
            u.email as owner_email
        FROM mindmaps m 
        JOIN users u ON m.user_id = u.id
        ORDER BY m.id
        """
        cursor.execute(query)
        maps = cursor.fetchall()
        
        print("\n" + "="*120)
        print("MIND MAP DATA")
        print("="*120)
        
        if not maps:
            print("No mind maps found.")
            return
        
        for m in maps:
            print(f"\nMap ID: {m['map_id']}")
            print(f"  Title:       {m['title']}")
            print(f"  User ID:     {m['user_id']}")
            print(f"  Owner:       {m['owner_email']}")
            print(f"  Created:     {m['created_at']}")
            print(f"  Updated:     {m['updated_at']}")
            data_preview = m['data'][:100] + "..." if m['data'] and len(m['data']) > 100 else m['data']
            print(f"  Data:        {data_preview}")
        
        print(f"\n{'='*120}")
        print(f"TOTAL MAPS: {len(maps)}")
        print(f"{'='*120}\n")
    finally:
        conn.close()

def view_all(args):
    """View complete database overview."""
    print("\n" + "="*120)
    print("COMPLETE DATABASE VIEW")
    print("="*120)
    view_users(args)
    view_maps(args)

def export_data(args):
    """Export database to JSON or CSV."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get users
        cursor.execute("SELECT * FROM users")
        users = [dict(row) for row in cursor.fetchall()]
        
        # Get maps
        cursor.execute("""
            SELECT m.*, u.email as owner_email 
            FROM mindmaps m 
            JOIN users u ON m.user_id = u.id
        """)
        maps = [dict(row) for row in cursor.fetchall()]
        
        output_file = args.output or f"mindmap_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{args.format}"
        
        if args.format == 'json':
            data = {
                'export_date': datetime.now().isoformat(),
                'users': users,
                'mindmaps': maps
            }
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✓ Data exported to {output_file} (JSON format)")
            
        elif args.format == 'csv':
            # Export users to CSV
            users_file = output_file.replace('.csv', '_users.csv')
            with open(users_file, 'w', newline='', encoding='utf-8') as f:
                if users:
                    writer = csv.DictWriter(f, fieldnames=users[0].keys())
                    writer.writeheader()
                    writer.writerows(users)
            
            # Export maps to CSV
            maps_file = output_file.replace('.csv', '_maps.csv')
            with open(maps_file, 'w', newline='', encoding='utf-8') as f:
                if maps:
                    writer = csv.DictWriter(f, fieldnames=maps[0].keys())
                    writer.writeheader()
                    writer.writerows(maps)
            
            print(f"✓ Data exported to:")
            print(f"  - {users_file} (Users)")
            print(f"  - {maps_file} (Maps)")
        
        print(f"\nExported {len(users)} users and {len(maps)} maps")
        
    except Exception as e:
        print(f"Error exporting data: {e}")
    finally:
        conn.close()

def delete_users(args):
    """Delete multiple users and their associated maps."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        user_ids = args.user_ids
        
        # Verify users exist and get info
        placeholders = ','.join('?' * len(user_ids))
        cursor.execute(f"SELECT id, email FROM users WHERE id IN ({placeholders})", user_ids)
        existing_users = cursor.fetchall()
        
        if not existing_users:
            print("No users found with the provided IDs.")
            return
        
        # Count maps for each user
        total_maps = 0
        user_info = []
        for user in existing_users:
            cursor.execute("SELECT COUNT(*) as count FROM mindmaps WHERE user_id = ?", (user['id'],))
            map_count = cursor.fetchone()['count']
            total_maps += map_count
            user_info.append(f"  - User {user['id']}: {user['email']} ({map_count} maps)")
        
        # Confirmation
        if not args.force:
            print("\nThe following users will be PERMANENTLY DELETED:")
            for info in user_info:
                print(info)
            print(f"\nTotal maps to be deleted: {total_maps}")
            confirm = input("\nAre you sure? (y/N): ")
            if confirm.lower() != 'y':
                print("Operation cancelled.")
                return
        
        # Delete maps first
        cursor.execute(f"DELETE FROM mindmaps WHERE user_id IN ({placeholders})", user_ids)
        maps_deleted = cursor.rowcount
        
        # Delete users
        cursor.execute(f"DELETE FROM users WHERE id IN ({placeholders})", user_ids)
        users_deleted = cursor.rowcount
        
        conn.commit()
        
        print(f"\n✓ Deleted {users_deleted} users and {maps_deleted} maps")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def delete_maps(args):
    """Delete multiple mind maps."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        map_ids = args.map_ids
        
        # Verify maps exist
        placeholders = ','.join('?' * len(map_ids))
        cursor.execute(f"""
            SELECT m.id, m.title, u.email 
            FROM mindmaps m 
            JOIN users u ON m.user_id = u.id 
            WHERE m.id IN ({placeholders})
        """, map_ids)
        existing_maps = cursor.fetchall()
        
        if not existing_maps:
            print("No maps found with the provided IDs.")
            return
        
        # Confirmation
        if not args.force:
            print("\nThe following maps will be PERMANENTLY DELETED:")
            for m in existing_maps:
                print(f"  - Map {m['id']}: {m['title']} (Owner: {m['email']})")
            confirm = input("\nAre you sure? (y/N): ")
            if confirm.lower() != 'y':
                print("Operation cancelled.")
                return
        
        # Delete maps
        cursor.execute(f"DELETE FROM mindmaps WHERE id IN ({placeholders})", map_ids)
        deleted = cursor.rowcount
        conn.commit()
        
        print(f"\n✓ Deleted {deleted} maps")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def update_user(args):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        updates = []
        params = []
        
        if args.email:
            updates.append("email = ?")
            params.append(args.email)
        
        if args.password:
            hashed = get_password_hash(args.password)
            updates.append("hashed_password = ?")
            params.append(hashed)
            
        if not updates:
            print("No updates specified.")
            return

        params.append(args.user_id)
        
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)
        conn.commit()
        
        if cursor.rowcount > 0:
            print(f"✓ User {args.user_id} updated successfully.")
        else:
            print(f"User {args.user_id} not found.")
    except sqlite3.IntegrityError:
        print("Error: Email already exists.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

def update_map(args):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM mindmaps WHERE id = ?", (args.map_id,))
        if not cursor.fetchone():
            print(f"MindMap {args.map_id} not found.")
            return

        if args.title:
            cursor.execute("UPDATE mindmaps SET title = ?, updated_at = ? WHERE id = ?", 
                           (args.title, datetime.now(), args.map_id))
            conn.commit()
            print(f"✓ MindMap {args.map_id} title updated to '{args.title}'.")
        else:
            print("No changes specified.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

def main():
    parser = argparse.ArgumentParser(
        description="Mind Map Database Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # View Commands
    subparsers.add_parser("view-users", help="View all users with their map IDs")
    subparsers.add_parser("view-maps", help="View all mind maps with user info")
    subparsers.add_parser("view-all", help="View complete database")

    # Export Command
    export_parser = subparsers.add_parser("export-data", help="Export database to file")
    export_parser.add_argument("--format", choices=['json', 'csv'], default='json', 
                              help="Export format (default: json)")
    export_parser.add_argument("--output", help="Output filename (auto-generated if not specified)")

    # Delete Users (batch)
    del_users = subparsers.add_parser("delete-users", help="Delete multiple users")
    del_users.add_argument("user_ids", type=int, nargs='+', help="User IDs to delete (space-separated)")
    del_users.add_argument("--force", action="store_true", help="Skip confirmation")

    # Delete Maps (batch)
    del_maps = subparsers.add_parser("delete-maps", help="Delete multiple maps")
    del_maps.add_argument("map_ids", type=int, nargs='+', help="Map IDs to delete (space-separated)")
    del_maps.add_argument("--force", action="store_true", help="Skip confirmation")

    # Update User
    up_user = subparsers.add_parser("update-user", help="Update user details")
    up_user.add_argument("user_id", type=int, help="User ID")
    up_user.add_argument("--email", help="New email address")
    up_user.add_argument("--password", help="New password (will be hashed)")

    # Update Map
    up_map = subparsers.add_parser("update-map", help="Update mind map")
    up_map.add_argument("map_id", type=int, help="MindMap ID")
    up_map.add_argument("--title", help="New title")

    args = parser.parse_args()

    if args.command == "view-users":
        view_users(args)
    elif args.command == "view-maps":
        view_maps(args)
    elif args.command == "view-all":
        view_all(args)
    elif args.command == "export-data":
        export_data(args)
    elif args.command == "delete-users":
        delete_users(args)
    elif args.command == "delete-maps":
        delete_maps(args)
    elif args.command == "update-user":
        update_user(args)
    elif args.command == "update-map":
        update_map(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()