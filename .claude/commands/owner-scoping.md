---
description: Checklist for adding or changing a model, endpoint, action or serializer field without leaking one user's data to another. Use for any backend change that reads or writes user data.
---

# Owner scoping

Several friends share one database. Every row of user data belongs to exactly one account,
and nothing is shared between accounts. A single unscoped query lets someone see or edit
another person's bar, which makes it the most serious bug this app can have. Work through
this checklist for every model, endpoint, custom action or serializer field you add or
change. Say in your summary which items applied and how you handled them.

The tools already exist. Use them instead of writing your own:

| Tool | Where | What it does |
|---|---|---|
| `owner_field(related_name)` | `cocktails/models.py` | The required, `PROTECT` owner FK |
| `unique_name_per_owner(model_name)` | `cocktails/models.py` | `UniqueConstraint(owner, name)` |
| `OwnerScopedMixin` | `cocktails/views.py` | Scopes `get_queryset()` to `request.user` and sets `owner` in `perform_create` |
| `OwnedPrimaryKeyRelatedField` | `cocktails/serializers.py` | A writable id that must name one of the requester's own rows |
| `UniqueNamePerOwnerMixin` | `cocktails/serializers.py` | Turns a per-owner name clash into a 400 instead of an `IntegrityError` |
| `OwnedAdmin` | `cocktails/admin.py` | Shows and filters by owner in Django admin |
| `TwoUserAPITestCase` | `cocktails/tests.py` | Two accounts, each with one row of every kind (`self.mine`, `self.theirs`) |

## 1. Decide who owns the new data

- **Owned directly**: user data that stands on its own, like a recipe or a menu. Give it
  `owner = owner_field('<plural_related_name>')`. Never `null=True` on a new model. A
  nullable owner is only a step while migrating an existing table (see `safe-migration`).
- **Owned through a parent**: a row that only exists inside something owned, like
  `MenuItem`, `Order` or `RecipeIngredient`. Give it no owner column. Scope every query
  through the parent (`menu__owner=request.user`), and put a comment on the model saying
  so, as `MenuItem` and `Order` have.
- **Account-level** (`accounts` app): same rule, under a different field name. For
  example, `Invite` is looked up with `created_by=request.user`. Your own user record comes
  from `request.user`, never from an id in the URL or body.
- **Deliberately public**: see step 5. This needs a reason you can write down.

If names should be unique, make them unique **per owner** with `unique_name_per_owner`.
Never use `unique=True`, because two people can both have "Rum".

## 2. ViewSet and views

- Put `OwnerScopedMixin` **first** in the bases: `class FooViewSet(OwnerScopedMixin, viewsets.ModelViewSet)`.
  If you override `get_queryset`, start from `super().get_queryset()` so the owner filter
  stays (see `RecipeViewSet`).
- For a child model with no owner, override `get_queryset` to filter through the parent
  (`MenuItemViewSet`, `OrderViewSet`). Take the parent from `self.get_object()` on an owned
  viewset (`MenuViewSet.add_item`), never from an id the client sends.
- **The mixin only scopes `self.get_queryset()`.** Every other query you write needs its
  own scoping. Read your view and look for each `Model.objects.`:
  - in a custom `@action` (`IngredientViewSet.recipes` and `MenuViewSet.stats` add
    `owner=request.user` by hand)
  - for ids in query params, which are looked up among the requester's own rows so a foreign
    id matches nothing (`RecipeViewSet.get_queryset`)
  - for ids in a list body, which are reached through an owned parent
    (`menu.items.filter(pk=...)` in `reorder_items`, not `MenuItem.objects.filter(pk=...)`)
  - in an overridden `create`/`update` (`IngredientCategoryViewSet` creates its generic
    ingredient with `owner=request.user`)
- Create through `serializer.save(owner=request.user)`, which `perform_create` does for you.
  Never accept `owner` from the request.
- A plain `APIView` has no mixin. Use `get_object_or_404(Model, pk=pk, owner=request.user)`
  (or `created_by=` and so on).
- Someone else's object must come back as **404**, never 403. Scoping the queryset gives
  you this for free; don't add a separate check that answers "forbidden".

## 3. Serializers

- **Every writable related id** uses `OwnedPrimaryKeyRelatedField(queryset=Model.objects.all(), ...)`.
  Scoping the viewset only guards the object in the URL. Without this, user A could attach
  user B's recipe to A's menu by id. A child model with no `owner` needs its own field
  that filters through the parent.
- `owner` is **never** a serializer field, whether readable or writable.
- The serializer needs `request` in its context. When you build one by hand inside a view,
  pass `context=self.get_serializer_context()` (`add_item` does). Without it,
  `OwnedPrimaryKeyRelatedField` raises rather than falling back to every user's rows. Keep
  it that way.
- Fields that move a row between parents should be read-only unless moving is the point
  (`OrderSerializer` makes `recipe` and `menu` read-only for this reason).
- A `SerializerMethodField` that runs a query should go through `obj`'s own relations
  (`Ingredient.objects.filter(category=obj)`), never a global lookup by name or id.
- Per-owner unique names use `UniqueNamePerOwnerMixin`, because DRF cannot generate the
  check when `owner` is not a field.

## 4. Caching

Vercel's CDN sits in front of `/api`. `Cache-Control: public` on a per-user response is how
one person gets served another person's data. `PublicCacheMixin` belongs on the shared menu
only. Never add it, or any `public` or `s-maxage` header, to owner-scoped, per-guest or
account responses. `CacheHeaderTests` pins this.

## 5. Public endpoints (rare)

The API is default-deny. The only exceptions are guest-facing endpoints keyed by a menu's
unguessable `share_token`: `PublicMenuView`, `GuestOrderListView` and `GuestOrderDetailView`.
Account flows that happen before login (signup, login, password reset) are public too, and
each is guarded by its own token or credential. A new public endpoint must:

- set **both** `permission_classes = [AllowAny]` and `authentication_classes = []`
- look its data up by an unguessable token, never by a sequential id
- return only what a guest needs. Owner-only fields, other menus' share tokens or another
  guest's orders must not come back in the response
- get a case in `AnonymousAccessTests`, and a rate-limiting thought (15.0)

## 6. Admin

Register owned models with `OwnedAdmin` so the owner is visible, filterable and chosen
explicitly. Admin is for superusers and is not scoped. That is intentional.

## 7. Tests (required, in `cocktails/tests.py` or `accounts/tests.py`)

For a new owned model, extend the shared two-user setup rather than writing a one-off:

- Add a row to `TwoUserAPITestCase.make_bar` and its URL to `detail_urls`. The read,
  update and delete 404 tests in `CrossUserIsolationTests` then cover it automatically.
  Add its list URL to `test_lists_contain_only_my_rows`.
- Add each new custom action to `test_another_users_detail_actions_are_not_found`.
- Add a `ForeignIdTests` case for every new writable id: someone else's id gets a **400**,
  and nothing is created or changed.
- Add a case to `OwnerAssignmentTests` showing that created rows belong to the requester,
  even when the body names another owner.
- Add the list and detail URLs to `AnonymousAccessTests.test_anonymous_cannot_read_anything_private`
  (expect **401**).

Run `python manage.py test` from `backend/` with the venv active.

## Before you finish

Search your diff for `objects.`, `get_object_or_404`, `PrimaryKeyRelatedField`, `AllowAny`
and `cache`. Each hit should be scoped, owned, deliberately public or harmless, and you
should be able to say which.
