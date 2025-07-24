<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ConfigureAi extends Command
{
    protected $signature = 'ai:configure';
    protected $description = 'Configure AI provider settings based on your system specs';

    public function handle()
    {
        $this->info('🤖 AI Configuration Helper');
        $this->line('');

        // Get system info
        $this->line('Detecting system specifications...');
        $ramGB = $this->getSystemRam();
        $hasGPU = $this->hasNvidiaGPU();
        
        $this->table(['Component', 'Detected'], [
            ['RAM', $ramGB . 'GB'],
            ['NVIDIA GPU', $hasGPU ? 'Yes' : 'No'],
        ]);
        
        $this->line('');

        // Ask for provider preference
        $provider = $this->choice(
            'Which AI provider would you like to use?',
            ['openai' => 'OpenAI (cloud, requires API key)', 'ollama' => 'Ollama (local, free)'],
            'openai'
        );

        if ($provider === 'ollama') {
            $this->configureOllama($ramGB);
        } else {
            $this->configureOpenAI();
        }
    }

    private function configureOllama(int $ramGB): void
    {
        $this->info('🦙 Configuring Ollama');
        
        // Recommend models based on RAM
        $recommendations = $this->getOllamaRecommendations($ramGB);
        
        $this->line('Recommended models for your system:');
        foreach ($recommendations as $purpose => $model) {
            $this->line("  • {$purpose}: <fg=green>{$model}</>");
        }
        
        $chatModel = $this->ask('Chat model', $recommendations['Chat']);
        $extractionModel = $this->ask('Parameter extraction model', $recommendations['Extraction']);  
        $subjectModel = $this->ask('Subject generation model', $recommendations['Subject']);
        
        $this->info('Add these to your .env file:');
        $this->line('');
        $this->line("AI_PROVIDER=ollama");
        $this->line("AI_OLLAMA_CHAT_MODEL={$chatModel}");
        $this->line("AI_OLLAMA_EXTRACTION_MODEL={$extractionModel}");
        $this->line("AI_OLLAMA_SUBJECT_MODEL={$subjectModel}");
        $this->line("AI_OLLAMA_BASE_URL=http://localhost:11434");
        
        $this->line('');
        $this->info("Don't forget to pull the models:");
        foreach (array_unique([$chatModel, $extractionModel, $subjectModel]) as $model) {
            $this->line("ollama pull {$model}");
        }
    }

    private function configureOpenAI(): void
    {
        $this->info('🧠 Configuring OpenAI');
        
        $chatModel = $this->choice('Chat model', [
            'gpt-4o-mini' => 'GPT-4o Mini (cost-effective)',
            'gpt-4o' => 'GPT-4o (high performance)',
        ], 'gpt-4o-mini');
        
        $this->info('Add these to your .env file:');
        $this->line('');
        $this->line("AI_PROVIDER=openai");
        $this->line("AI_OPENAI_CHAT_MODEL={$chatModel}");
        $this->line("AI_OPENAI_EXTRACTION_MODEL=gpt-4o-mini");
        $this->line("AI_OPENAI_SUBJECT_MODEL=gpt-4o-mini");
        $this->line('');
        $this->warn("Don't forget to set your OPENAI_API_KEY in .env");
    }

    private function getSystemRam(): int
    {
        $meminfo = file_get_contents('/proc/meminfo');
        preg_match('/MemTotal:\s+(\d+)/', $meminfo, $matches);
        return round($matches[1] / 1024 / 1024); // Convert to GB
    }

    private function hasNvidiaGPU(): bool
    {
        return shell_exec('which nvidia-smi') !== null;
    }

    private function getOllamaRecommendations(int $ramGB): array
    {
        if ($ramGB <= 8) {
            return [
                'Chat' => 'llama3.2:3b',
                'Extraction' => 'llama3.2:3b', 
                'Subject' => 'llama3.2:3b',
            ];
        } elseif ($ramGB <= 16) {
            return [
                'Chat' => 'llama3.2:8b',
                'Extraction' => 'llama3.2:8b',
                'Subject' => 'llama3.2:3b',
            ];
        } else {
            return [
                'Chat' => 'qwen2.5:14b',
                'Extraction' => 'llama3.2:8b', 
                'Subject' => 'llama3.2:3b',
            ];
        }
    }
}
