mod context;
mod store;

pub use context::AppContext;
pub use store::AppStore;
use tauri_plugin_sql::{Migration, MigrationKind};

pub const SQL_CHAT_DB: &str = "sqlite:chat.db";

pub fn generate_db_migrations() -> Vec<Migration> {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        kind: MigrationKind::Up,
        sql: "
                CREATE TABLE conversations (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    last_message_at INTEGER
                );
                CREATE TABLE messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    content TEXT,
                    created_at INTEGER NOT NULL,
                    sender_id TEXT,
                    nickname TEXT,
                    -- The corrected foreign key with ON DELETE CASCADE --
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
            ",
    }];
    migrations
}
