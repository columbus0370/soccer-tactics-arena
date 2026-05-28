import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage'
import TeamSelectPage from './pages/TeamSelectPage'
import MatchPage from './pages/MatchPage'
import ResultPage from './pages/ResultPage'
import PresetPage from './pages/PresetPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/team-select" element={<TeamSelectPage />} />
        <Route path="/match" element={<MatchPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/preset" element={<PresetPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
