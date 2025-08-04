<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class GenerateMcpToken extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mcp:generate-token {user_id} {--name=mcp-server}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate an API token for MCP server authentication';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id');
        $tokenName = $this->option('name');

        $user = User::find($userId);
        
        if (!$user) {
            $this->error("User with ID {$userId} not found.");
            return 1;
        }

        $token = $user->createToken($tokenName, ['chat:create']);
        
        $this->info("API token generated for user: {$user->name}");
        $this->info("Token name: {$tokenName}");
        $this->line("Token: {$token->plainTextToken}");
        $this->newLine();
        $this->warn("Save this token securely - it will not be shown again!");
        
        return 0;
    }
}
