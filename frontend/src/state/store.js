export const appState = {
  bootstrapped: false,
};

export function markBootstrapped() {
  appState.bootstrapped = true;
}
