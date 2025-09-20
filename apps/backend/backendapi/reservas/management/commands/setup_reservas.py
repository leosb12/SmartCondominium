from django.core.management.base import BaseCommand
from core.supabase_client import supabase_admin
import os
import traceback

class Command(BaseCommand):
    help = 'Setup reservas module database tables, triggers, and sample data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-sample-data',
            action='store_true',
            help='Skip inserting sample data',
        )

    def handle(self, *args, **options):
        try:
            client = supabase_admin
            
            # Get the path to the SQL files
            sql_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'sql')
            
            # Read and execute create_tables.sql
            self.stdout.write('Creating tables...')
            with open(os.path.join(sql_dir, 'create_tables.sql'), 'r') as f:
                create_tables_sql = f.read()
            
            # Execute table creation (this might need to be done via raw SQL in production)
            self.stdout.write('Note: Tables and constraints need to be created manually in Supabase SQL editor')
            self.stdout.write('Please run the following SQL files in your Supabase dashboard:')
            self.stdout.write(f'1. {os.path.join(sql_dir, "create_tables.sql")}')
            self.stdout.write(f'2. {os.path.join(sql_dir, "create_triggers.sql")}')
            
            if not options['skip_sample_data']:
                self.stdout.write(f'3. {os.path.join(sql_dir, "sample_data.sql")} (optional)')
            
            # Test basic connectivity
            self.stdout.write('Testing Supabase connectivity...')
            result = client.table('area_social').select('count', count='exact').execute()
            self.stdout.write(f'✓ Connection successful. Current area_social records: {result.count}')
            
            self.stdout.write(
                self.style.SUCCESS('Setup instructions displayed. Please run the SQL files manually in Supabase.')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during setup: {str(e)}')
            )
            self.stdout.write(traceback.format_exc())