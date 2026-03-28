'use client'; // Это клиентский компонент, так как есть ввод и состояние

import { useState } from 'react';

export const TerminalInput = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Логика команд
    const cmd = input.toLowerCase().trim();
    let response = '';

    if (cmd === 'help') response = 'Available commands: help, clear, projects, about';
    else if (cmd === 'projects') response = 'Fetching projects from Django... [OK]';
    else if (cmd === 'clear') {
        setHistory([]);
        setInput('');
        return;
    }
    else response = `Command not found: ${cmd}`;

    setHistory([...history, `admin@portfolio:~$ ${input}`, response]);
    setInput('');
  };

  return (
    <div className="font-mono mt-10">
      <div className="mb-4">
        {history.map((line, i) => (
          <div key={i} className={i % 2 === 0 ? "text-white/50" : "text-terminal-green mb-2"}>
            {line}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleCommand} className="flex gap-2">
        <span className="text-terminal-green">admin@portfolio:~$</span>
        <input 
          autoFocus
          className="bg-transparent outline-none border-none text-terminal-green w-full p-0"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
};