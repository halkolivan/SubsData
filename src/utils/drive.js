export async function saveSubscriptions(token, subscriptions) {
  const res = await fetch("http://localhost:4000/drive/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token, data: subscriptions }),
  });
  return res.json();
}

export async function loadSubscriptions(token) {
  const res = await fetch("http://localhost:4000/drive/load", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token }),
  });
  const { data } = await res.json();
  return data;
}
