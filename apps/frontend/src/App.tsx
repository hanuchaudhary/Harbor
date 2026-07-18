import { BrowserRouter } from "react-router";

import { Provider } from "./components/provider";
import { AppRouter } from "./router";

function App() {
  return (
    <Provider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
