"""
Script to fix notes missing customerId field in backup file.
This adds the customerId field to each note based on the key in customerNotes object.
"""

import json
import sys

def fix_backup_file(input_file, output_file=None):
    """
    Fix notes in backup file by adding customerId field to each note.
    """
    if output_file is None:
        output_file = input_file.replace('.json', '_fixed.json')
    
    print(f"Reading backup file: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    customerNotes = data.get('customerNotes', {})
    fixed_count = 0
    
    print("\nFixing notes...")
    for customerIdKey, notes in customerNotes.items():
        customerId = int(customerIdKey)  # Convert key to int
        
        if notes:
            for note in notes:
                # Only add customerId if it's missing
                if 'customerId' not in note or note.get('customerId') is None:
                    note['customerId'] = customerId
                    fixed_count += 1
                    print(f"  Fixed note {note.get('id', '?')} - added customerId: {customerId}")
    
    print(f"\nFixed {fixed_count} notes")
    
    # Also check and fix notes in IndexedDB format if present
    if 'notes' in data and isinstance(data['notes'], list):
        print("\nChecking IndexedDB notes...")
        for note in data['notes']:
            if not note.get('customerId') or note.get('customerId') is None:
                print(f"  Warning: IndexedDB note {note.get('id', '?')} also missing customerId")
                # Can't auto-fix IndexedDB notes without more context
    
    print(f"\nSaving fixed backup to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Done! Fixed backup saved to: {output_file}")
    print(f"\nYou can now import this fixed backup file.")
    return fixed_count

if __name__ == '__main__':
    input_file = 'chikas-daily-backup-2025-11-02 (1).json'
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    
    output_file = None
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    try:
        fixed = fix_backup_file(input_file, output_file)
        print(f"\n✅ Successfully fixed {fixed} notes!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

