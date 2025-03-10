import React from 'react';
import ColumnQuery from './components/ColumnQuery';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Report KPI</h1>
      </header>
      <main>
        <ColumnQuery />
      </main>
    </div>
  );
}

export default App; 